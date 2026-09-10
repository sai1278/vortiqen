from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware

import json
import time
import uuid
from prometheus_client import Counter, Histogram, CONTENT_TYPE_LATEST, generate_latest
from starlette.responses import Response

from app.config import settings
from app.database import close_db, init_db
from app.schemas import ContactCreate, ContactResponse, HealthResponse
from app.services.enquiries import enquiry_service
from app.services.rate_limit import client_identifier, rate_limiter

logger = logging.getLogger("uvicorn.error")

API_VERSION = "1.0.0"

# Prometheus metrics
REQUEST_COUNT = Counter(
    "vortiqen_http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"],
)
REQUEST_LATENCY = Histogram(
    "vortiqen_http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["endpoint"],
)
ENQUIRIES_TOTAL = Counter(
    "vortiqen_enquiries_total",
    "Total business enquiries submitted",
    ["status"],
)

# Messages shown to visitors. Deliberately generic: a failure reason belongs in
# the log, not in a response that a stranger can read.
MSG_SUCCESS = "Thanks — your enquiry has been received."
MSG_FAILURE = "Something went wrong while sending your enquiry. Please try again."
MSG_RATE_LIMITED = (
    "You've sent several enquiries recently. Please wait a few minutes before trying again."
)

@asynccontextmanager
async def lifespan(_: FastAPI):
    """Make a misconfigured deployment obvious in the first lines of the log."""
    logger.info(
        "%s v%s starting — environment=%s, origins=%s",
        settings.APP_NAME,
        API_VERSION,
        settings.ENVIRONMENT,
        ", ".join(settings.cors_origins),
    )
    logger.info(
        "Enquiry delivery — db=%s, webhook=%s, baserow=%s, smtp=%s, local_store_accepted=%s",
        settings.database_configured,
        settings.webhook_configured,
        settings.baserow_configured,
        settings.smtp_configured,
        settings.local_store_counts_as_delivery,
    )
    # Initialize database
    await init_db()

    if not settings.can_accept_enquiries:
        logger.critical(
            "/api/contact will REJECT submissions: no persistence or external channel is configured "
            "and the local store is not accepted in this environment. "
            "Set DATABASE_URL, NOTIFICATION_WEBHOOK_URL or SMTP_*, or "
            "ALLOW_LOCAL_PERSISTENCE_IN_PRODUCTION=true."
        )
    yield
    await close_db()


app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Backend services for the Vortiqen website and business enquiries."
    ),
    version=API_VERSION,
    lifespan=lifespan,
)

@app.middleware("http")
async def security_and_observability_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    start_time = time.monotonic()

    response = await call_next(request)

    latency = time.monotonic() - start_time
    latency_ms = round(latency * 1000, 2)

    # Attach headers
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

    # Update Prometheus metrics
    endpoint = request.url.path
    status_code = str(response.status_code)
    REQUEST_COUNT.labels(method=request.method, endpoint=endpoint, status=status_code).inc()
    REQUEST_LATENCY.labels(endpoint=endpoint).observe(latency)

    # Structured JSON log (exclude noisy health/metrics checks from high-severity logging)
    if endpoint not in ("/api/health", "/metrics", "/"):
        logger.info(
            json.dumps({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "request_id": request_id,
                "method": request.method,
                "path": endpoint,
                "status": response.status_code,
                "latency_ms": latency_ms,
                "client_ip": client_identifier(request),
            })
        )

    return response

# ---------------------------------------------------------------------- CORS
#
# Exact origins only, and credentials are OFF.
#
# The previous configuration paired allow_origins=["*"] with
# allow_credentials=True, which makes Starlette reflect *any* Origin header
# back and set Access-Control-Allow-Credentials: true — a credentialed
# cross-origin grant to every site on the internet.
#
# The website calls this API with plain JSON and no cookies or auth header, so
# credentials are not needed at all. Turning them off removes the class of bug
# rather than just narrowing it. Config validation additionally rejects "*".
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
    max_age=600,
)


@app.get("/", tags=["Health"])
async def root() -> dict:
    return {
        "service": settings.APP_NAME,
        "version": API_VERSION,
        "status": "online",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/metrics", include_in_schema=False)
async def metrics() -> Response:
    """Prometheus metrics endpoint."""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
async def health_check() -> HealthResponse:
    """Readiness for the Vortiqen website.

    Reports ``degraded`` when the API is up but cannot actually deliver an
    enquiry, so a monitor catches a broken contact form before a visitor does.
    """
    accepting = settings.can_accept_enquiries
    return HealthResponse(
        status="healthy" if accepting else "degraded",
        environment=settings.ENVIRONMENT,
        version=API_VERSION,
        accepting_enquiries=accepting,
        delivery_channels={
            "webhook": settings.webhook_configured or settings.baserow_configured,
            "email": settings.smtp_configured,
            "local_store": settings.local_store_counts_as_delivery or settings.database_configured,
        },
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@app.post(
    "/api/contact",
    response_model=ContactResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Enquiries"],
    summary="Submit a business enquiry",
)
async def submit_contact(payload: ContactCreate, request: Request) -> ContactResponse:
    """
    Receives an enquiry from the website's "Start a Project" form.

    Returns 201 only when the enquiry has actually reached a destination that
    a human will read. If delivery cannot be confirmed the response is 502 and
    the visitor is asked to try again — never told it succeeded.
    """
    key = client_identifier(request)

    if not await rate_limiter.allow(key):
        ENQUIRIES_TOTAL.labels(status="rate_limited").inc()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=MSG_RATE_LIMITED,
        )

    try:
        outcome = await enquiry_service.submit(payload)
    except Exception:
        # Unexpected failure: full detail to the log, nothing to the caller.
        ENQUIRIES_TOTAL.labels(status="error").inc()
        logger.exception("Unhandled error while handling an enquiry")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=MSG_FAILURE,
        )

    if not outcome.delivered:
        ENQUIRIES_TOTAL.labels(status="undelivered").inc()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=MSG_FAILURE,
        )

    ENQUIRIES_TOTAL.labels(status="success").inc()
    logger.info(
        "Enquiry %s delivered (stored=%s, channels=%s)",
        outcome.reference,
        outcome.stored,
        outcome.channels,
    )

    return ContactResponse(
        success=True,
        message=MSG_SUCCESS,
        reference=outcome.reference,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
