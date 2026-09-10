# Vortiqen Database Backup, Recovery & Disaster Recovery Runbook

**System:** Vortiqen Production PostgreSQL Database  
**Author:** DevOps & SRE Engineering Team  
**Scope:** Lead Enquiries Persistence & Operational Data

---

## 1. Production Architecture Overview

The primary data store for customer enquiries is a PostgreSQL relational database.  
In production, enquiries are committed to the `enquiries` table within an explicit database transaction with row-level integrity.

Table Schema:
```sql
CREATE TABLE enquiries (
    id SERIAL PRIMARY KEY,
    reference VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL,
    company VARCHAR(150),
    service VARCHAR(50),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    delivered BOOLEAN NOT NULL DEFAULT FALSE,
    delivery_channels JSONB
);

CREATE INDEX idx_enquiries_email ON enquiries (email);
CREATE INDEX idx_enquiries_reference ON enquiries (reference);
```

---

## 2. Automated Backup Strategy

### Managed Cloud Database (AWS RDS / GCP Cloud SQL / Azure Database)
When running on managed cloud infrastructure:
1. **Automated Daily Snapshots:** Retention configured for **30 days**.
2. **Continuous WAL Archiving:** Point-in-Time Recovery (PITR) enabled with a 7-day rollback window (5-minute RPO).
3. **Cross-Region Snapshot Copy:** Nightly automated copy to a secondary cloud region for geographic redundancy.

### Self-Hosted / Containerized PostgreSQL
For containerized deployments using Docker / Kubernetes:
1. **Nightly Logical Dump:** Executed via cron / Kubernetes CronJob using `pg_dump`:
   ```bash
   TIMESTAMP=$(date +%Y%m%d_%H%M%S)
   docker exec vortiqen-db pg_dump -U vortiqen -F c -b -v -f "/var/lib/postgresql/data/backups/vortiqen_${TIMESTAMP}.dump" vortiqen
   ```
2. **Offsite Upload:** Ship compressed dumps to an encrypted S3/GCS bucket with SSE-KMS encryption and 90-day lifecycle expiration.

---

## 3. Step-by-Step Restoration Procedure

### Scenario A: Restoring from a Logical Dump (.dump)

1. **Stop Application Ingress:**
   Temporarily scale backend replicas to 0 or point the reverse proxy to a maintenance page to prevent incoming concurrent writes:
   ```bash
   docker compose stop backend
   ```

2. **Verify Backup Integrity:**
   List and inspect the backup archive contents:
   ```bash
   pg_restore -l /path/to/vortiqen_backup.dump | head -n 30
   ```

3. **Recreate or Clean Database Target:**
   ```bash
   docker exec -it vortiqen-db psql -U vortiqen -c "DROP DATABASE IF EXISTS vortiqen_restore;"
   docker exec -it vortiqen-db psql -U vortiqen -c "CREATE DATABASE vortiqen_restore;"
   ```

4. **Restore Database from Archive:**
   ```bash
   docker exec -i vortiqen-db pg_restore -U vortiqen -d vortiqen_restore -v < /path/to/vortiqen_backup.dump
   ```

5. **Verify Row Counts & Table Integrity:**
   ```bash
   docker exec -it vortiqen-db psql -U vortiqen -d vortiqen_restore -c "SELECT COUNT(*), MAX(created_at) FROM enquiries;"
   ```

6. **Promote Restored Database:**
   ```bash
   docker exec -it vortiqen-db psql -U vortiqen -c "ALTER DATABASE vortiqen RENAME TO vortiqen_old;"
   docker exec -it vortiqen-db psql -U vortiqen -c "ALTER DATABASE vortiqen_restore RENAME TO vortiqen;"
   ```

7. **Restart Application & Run Smoke Verification:**
   ```bash
   docker compose start backend
   curl -f http://localhost:8000/api/health
   ```

---

## 4. Auxiliary Data Recovery (JSONL Fallback Reconciliation)

In the event of a catastrophic database failure where submissions were temporarily captured by the local JSONL append-only log (`data/enquiries.jsonl`), run the reconciliation script to import uncommitted records:

```python
# scripts/reconcile_enquiries.py
import json, asyncio
from pathlib import Path
from app.database import async_session_factory, EnquiryModel
from sqlalchemy import select

async def reconcile():
    store_path = Path("data/enquiries.jsonl")
    if not store_path.exists():
        print("No local store found.")
        return

    async with async_session_factory() as session:
        for line in store_path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            rec = json.loads(line)
            # Check if reference already exists
            existing = await session.execute(
                select(EnquiryModel).where(EnquiryModel.reference == rec["reference"])
            )
            if existing.scalar_one_or_none():
                continue
            
            entry = EnquiryModel(
                reference=rec["reference"],
                name=rec["name"],
                email=rec["email"],
                company=rec.get("company"),
                service=rec.get("service"),
                message=rec["message"],
                delivered=True
            )
            session.add(entry)
        await session.commit()
    print("Reconciliation complete.")

if __name__ == "__main__":
    asyncio.run(reconcile())
```

---

## 5. Recovery Objectives

- **Recovery Point Objective (RPO):** < 5 minutes (with WAL archiving) or < 24 hours (nightly dump).
- **Recovery Time Objective (RTO):** < 15 minutes to complete snapshot restoration and verify `/api/health`.
