# Vortiqen — Company Website

The official website for **Vortiqen**, a software company building reliable, scalable,
intelligent digital products and engineering solutions.

Built with React 18, Vite, Tailwind CSS, Framer Motion, and Lucide.

---

## Design system

The visual language is Swiss/minimalist on a near-black canvas: hairline rules,
a strict type scale, generous whitespace, and a single restrained accent used
only for state and emphasis. Identity comes from geometry and typography rather
than from colour or gradients.

### Colour

All foreground/background pairs are verified against WCAG AA.

| Token | Value | Role |
| --- | --- | --- |
| `ink-0` | `#08090B` | Canvas |
| `ink-1` / `ink-2` / `ink-3` | `#0B0D10` / `#101317` / `#171B21` | Surface ladder |
| `fg-0` | `#F7F8F8` | Primary text — 18.7:1 on canvas |
| `fg-1` | `#AAB1BC` | Secondary text — 9.2:1 |
| `fg-2` | `#8A919D` | Tertiary / metadata — 6.3:1 |
| `accent` | `#4C7EFF` | Interactive state, emphasis — 5.4:1 |
| `accent-soft` | `#9DB8FF` | Accent text on dark — 10.2:1 |

> The accent fails 4.5:1 against white (3.66:1), so accent-filled surfaces use
> near-black labels. The primary button is white-on-near-black instead.

### Type

- **Display / headings** — Space Grotesk (geometric, technical)
- **Body / UI** — Inter
- **Metadata, eyebrows, tags** — JetBrains Mono

Scale is fluid via `clamp()`, defined in `tailwind.config.js`. Hero display type
runs 32px → 64px across 375px → 1440px and is sized so the three hero lines never
wrap, which the per-line mask reveal depends on.

### Motion

One vocabulary, defined once in `src/lib/motion.js`:

| Band | Duration | Used for |
| --- | --- | --- |
| Fast | 180ms | Hover, press, micro-interactions |
| Base | 320–420ms | Element entrances, state changes |
| Slow | 640–900ms | Section reveals, large objects |

Easing is expo-out (`cubic-bezier(0.16, 1, 0.3, 1)`) for arrivals and standard
(`cubic-bezier(0.4, 0, 0.2, 1)`) for UI. Larger objects travel further and
slower; small objects settle fast.

`prefers-reduced-motion` is honoured throughout: `MotionConfig reducedMotion="user"`
drops transform and layout animation globally, components owning continuous or
pointer-driven motion opt out via `useReducedMotion()`, and `index.css` neutralises
CSS-driven motion. The site is complete and readable with every animation removed.

---

## Structure

```text
frontend/
├── index.html                 # Meta, JSON-LD, font loading
├── tailwind.config.js         # Design tokens
├── public/favicon.svg
└── src/
    ├── components/
    │   ├── Navbar.jsx         # Fixed, compacts on scroll, mobile sheet
    │   ├── Hero.jsx           # Line-mask reveal, pointer + scroll parallax
    │   ├── HeroVisual.jsx     # Abstract aperture + service graph (SVG)
    │   ├── Intro.jsx          # Scroll-linked progressive statement reveal
    │   ├── Services.jsx       # Asymmetric 12-column grid
    │   ├── Process.jsx        # Sticky heading + scroll-driven pipeline rail
    │   ├── Work.jsx           # Native horizontal snap rail
    │   ├── Technology.jsx     # Interactive layered system diagram
    │   ├── About.jsx
    │   ├── CTA.jsx
    │   ├── Footer.jsx
    │   ├── EnquiryDialog.jsx  # Enquiry form: validation, states, focus trap
    │   └── ui/                # Button, Section, VortiqenMark
    ├── data/site.js           # All copy and content
    ├── hooks/                 # useScrolled, usePointer, useActiveSection,
    │                          # useEnquiry (dialog state + focus return)
    ├── lib/
    │   ├── motion.js          # Motion tokens and variants
    │   └── api.js             # The only place that talks to the API
    ├── App.jsx
    └── index.css              # Base, hairline primitives, reduced motion
```

Content lives entirely in `src/data/site.js`. It deliberately contains no
clients, logos, revenue, headcount, awards, testimonials, certifications, or
customer counts. The Work entries are labelled *capability area* — they describe
the kinds of systems built, not client case studies.

---

## Running the frontend alone

```bash
cd frontend
npm install
cp .env.example .env      # VITE_API_BASE_URL
npm run dev               # http://localhost:3000
npm run build
npm run preview
```

Requires Node 18+. The site renders without the API, but the "Start a Project"
enquiry form needs it — see **Running the full stack** below. "Talk to Vortiqen"
remains a `mailto:` to the address in `src/data/site.js`.

---

## Accessibility & UX

- Semantic landmarks, sequential headings, `aria-labelledby` on every section
- Skip-to-content link; visible `:focus-visible` rings never removed
- All interactive targets ≥44px; `Escape` closes the mobile sheet
- Horizontal work rail is native overflow with scroll-snap — keyboard scrollable,
  with arrow buttons as the pointer alternative to swiping
- No scroll-jacking; native scrolling is preserved throughout
- Verified with no horizontal overflow at 1440 / 1280 / 1024 / 768 / 390 / 375px

---

## Backend — Vortiqen API

FastAPI enterprise service backing the website's first-party enquiry flow.

```text
backend/app/
├── main.py                 # routes, CORS, structured JSON logging, security headers, Prometheus /metrics
├── config.py               # env-driven settings, fail-safe defaults, PostgreSQL & Baserow config
├── database.py             # SQLAlchemy 2.0 async engine, connection pool, EnquiryModel, init_db()
├── schemas.py              # ContactCreate / ContactResponse / HealthResponse
└── services/
    ├── enquiries.py        # delivery policy (the anti-silent-success rule)
    ├── storage.py          # PostgreSQL async persistence + append-only JSONL fallback (fsync'd)
    ├── notifications.py    # webhook, Baserow table sync, and SMTP channels
    └── rate_limit.py       # RateLimiter protocol + sliding window rate limiter
```

### Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/` | Service identity |
| `GET` | `/api/health` | Readiness probe; returns 200 with delivery channels and database status |
| `GET` | `/metrics` | Prometheus metrics (request count, latency histograms, error counters) |
| `POST` | `/api/contact` | Submit a business enquiry |

`POST /api/contact` takes `name`, `email`, `message` (required) plus optional
`company` and `service`, and a `company_website` honeypot that must stay empty.
It validates input, writes asynchronously to PostgreSQL with connection pooling,
dispatches to configured channels (Webhook, Baserow, SMTP), and returns
**201 with a unique customer reference code (e.g. `VQ-123456`)**.

### Delivery & Persistence Policy

Enquiries are never lost to ephemeral storage in production:

| Environment | Persistence & Delivery Channels |
| --- | --- |
| **development / staging** | PostgreSQL if configured, or local append-only JSONL (`data/enquiries.jsonl`). Notification channels are executed in background. |
| **production** | **PostgreSQL** is the authoritative primary store. Enquiries are also synced server-side to external webhooks, Baserow, or SMTP. An enquiry is considered delivered when securely stored in the transactional database or confirmed by an external channel. |

---

## Production Deployment Guide

### 1. Prerequisites

- **Docker & Docker Compose**: Docker Engine 24+ and Docker Compose v2.20+
- **Host / Cluster**: Linux VM (Ubuntu 22.04 LTS / Debian 12) or Kubernetes cluster
- **Domain & SSL**: Valid domain with DNS pointing to host and TLS certificate (e.g., Let's Encrypt / Cloudflare)
- **Database**: PostgreSQL 15+ (Cloud SQL, RDS, Supabase, or containerized PostgreSQL)

### 2. Environment Variables

Create `.env` based on `.env.example`:

```bash
cp .env.example .env
chmod 600 .env
```

Critical production variables:
- `ENVIRONMENT=production`
- `DATABASE_URL=postgresql+asyncpg://<user>:<password>@<db-host>:5432/<dbname>`
- `ALLOWED_ORIGINS=https://vortiqen.com,https://www.vortiqen.com`
- `VITE_API_BASE_URL=https://api.vortiqen.com` (or empty for same-origin proxy)
- `BASEROW_TABLE_URL=https://api.baserow.io/api/database/rows/table/<table_id>/?user_field_names=true`
- `BASEROW_API_TOKEN=<your_private_token>`
- `NOTIFICATION_WEBHOOK_URL=https://hooks.slack.com/services/...`

### 3. Local Development

```bash
# Terminal 1 — Backend
cd backend
python -m venv venv
# On Linux/macOS:
source venv/bin/activate
# On Windows:
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm install
cp .env.example .env
npm run dev
```

Run test suites:
```bash
# Backend pytest suite (38 unit & integration tests)
cd backend && pytest tests -v

# Frontend linting & production build
cd frontend && npm run lint && npm run build
```

### 4. Docker & Production Parity

The root `docker-compose.yml` provides a production-identical setup:
- **`vortiqen-frontend`**: Multi-stage build running unprivileged Nginx on port 8080 (mapped to 3000)
- **`vortiqen-backend`**: Hardened Python 3.12-slim running as non-root user `appuser:10001` on port 8000
- **`vortiqen-db`**: PostgreSQL 16 Alpine with healthchecks and persistent volumes

```bash
# Build and start all services in the background
docker compose build
docker compose up -d

# Verify all containers are healthy
docker compose ps

# Check logs
docker compose logs -f backend
```

### 5. Database Setup & Migrations

Production schema is strictly version-controlled and applied via **Alembic**. The application startup does not blindly mutate the production schema.

To apply database migrations:
```bash
cd backend
# Set DATABASE_URL if not using .env
export DATABASE_URL="postgresql+asyncpg://user:password@host:5432/dbname"
alembic upgrade head

# Inspect current revision
alembic current

# Create new autogenerated migration after model updates
alembic revision --autogenerate -m "describe_change"
```

The `enquiries` table schema includes:
- `id`: Auto-incrementing primary key
- `reference`: Unique indexed constraint for customer reference (e.g. `VQ-343397`)
- `name`, `email`, `company`, `service`, `message`: String / Text enquiry payloads
- `created_at`: UTC timestamp with index
- `delivered`: Boolean status flag indicating confirmed channel dispatch
- `delivery_channels`: JSON-serialized delivery tracking and source metadata

### 6. CI/CD Pipeline

A continuous integration pipeline is defined in `.github/workflows/ci.yml`:
1. **Frontend Lint & Build**: Runs `npm ci`, `npm run lint`, and `npm run build` on Node.js 20.
2. **Backend Test Suite**: Runs `pytest` across all 38 tests on Python 3.12.
3. **Docker Buildx Validation**: Builds both production Docker images to verify container hygiene, multi-stage compilation, and dependency integrity.

### 7. Observability & Health Probes

- **Health Check**: `GET /api/health`
  Returns JSON status including `accepting_enquiries`, database connection state, and configured channels.
- **Prometheus Metrics**: `GET /metrics`
  Exposes standard Prometheus metrics (`http_requests_total`, `http_request_duration_seconds`, active connections).
- **Structured JSON Logging**: Every HTTP request emits a structured JSON log entry containing `timestamp`, `request_id`, `method`, `path`, `status_code`, `latency_ms`, and `client_ip`.

### 8. Security Hardening

- **HTTP Headers**: All responses from both Nginx and FastAPI include:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - Content Security Policy (CSP) tailored for Google Fonts, Vite assets, and API connections
- **Non-Root Containers**: Nginx runs as `nginxinc/nginx-unprivileged` on port 8080; Python backend runs as unprivileged UID 10001.
- **CORS Strictness**: Wildcards (`*`) and unencrypted origins in production are rejected on application startup.

### 9. Backup & Disaster Recovery

See [`docs/backup-and-recovery.md`](file:///c:/Users/kanchiDhyana%20sai/Downloads/vortiqenfullstack/docs/backup-and-recovery.md) for full operational instructions:
- **Daily Automated Backup**:
  ```bash
  docker compose exec -t db pg_dump -U postgres -d vortiqen -F c -b -v -f /var/lib/postgresql/backup.dump
  ```
- **Point-in-Time Restoration**:
  ```bash
  docker compose exec -t db pg_restore -U postgres -d vortiqen -c -v /var/lib/postgresql/backup.dump
  ```
- **Fallback JSONL Reconciliation**:
  In the event of a database partition, leads temporarily written to `backend/data/enquiries.jsonl` can be reconciled to PostgreSQL using the included idempotency script.

### 10. Rollback & Incident Recovery

- **Zero-Downtime Rollback**:
  Deployments use immutable image tags (e.g., `vortiqen-backend:v1.2.0`). To roll back:
  ```bash
  docker compose down backend
  sed -i 's/v1.2.0/v1.1.9/g' docker-compose.prod.yml
  docker compose up -d backend
  ```
- **Health Verification**:
  Immediately inspect `/api/health` and verify `accepting_enquiries: true`.
