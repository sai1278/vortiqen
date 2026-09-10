from __future__ import annotations

import asyncio

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.services import enquiries, notifications, rate_limit, storage
from app.services.storage import EnquiryStore

client = TestClient(app)

VALID = {
    "name": "Dana Okafor",
    "email": "dana@example.com",
    "company": "Example Industries",
    "service": "cloud-devops",
    "message": "We need help moving our deployment pipeline onto Kubernetes.",
}


@pytest.fixture(autouse=True)
def isolate(monkeypatch, tmp_path):
    """Each test gets a fresh limiter, a temp store, and no live channels."""
    limiter = rate_limit.InMemoryRateLimiter()
    monkeypatch.setattr(rate_limit, "rate_limiter", limiter)
    monkeypatch.setattr("app.main.rate_limiter", limiter)

    store = EnquiryStore(str(tmp_path / "enquiries.jsonl"))
    monkeypatch.setattr(storage, "enquiry_store", store)
    monkeypatch.setattr(enquiries, "enquiry_store", store)

    # No outbound network in tests.
    monkeypatch.setattr(settings, "NOTIFICATION_WEBHOOK_URL", None)
    monkeypatch.setattr(settings, "SMTP_HOST", None)
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "TRUSTED_PROXY_COUNT", 0)

    yield store


# --------------------------------------------------------------------- health
def test_health_reports_healthy_in_development(isolate):
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert body["accepting_enquiries"] is True
    assert body["environment"] == "development"
    assert set(body["delivery_channels"]) == {"webhook", "email", "local_store"}


def test_health_reports_degraded_when_production_has_no_channel(monkeypatch, isolate):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "ALLOW_LOCAL_PERSISTENCE_IN_PRODUCTION", False)
    body = client.get("/api/health").json()
    assert body["status"] == "degraded"
    assert body["accepting_enquiries"] is False


def test_root_identifies_vortiqen(isolate):
    body = client.get("/").json()
    assert "Vortiqen" in body["service"]


def test_openapi_has_no_student_project_language(isolate):
    schema = client.get("/openapi.json").json()
    blob = str(schema).lower()
    for banned in ("student", "college", "capstone", "portal"):
        assert banned not in blob, f"OpenAPI still mentions {banned!r}"
    assert "vortiqen" in blob
    assert set(schema["paths"]) == {"/", "/api/health", "/api/contact"}


# -------------------------------------------------------------------- contact
def test_contact_success_persists_record(isolate):
    response = client.post("/api/contact", json=VALID)
    assert response.status_code == 201
    body = response.json()
    assert body["success"] is True
    assert body["message"] == "Thanks — your enquiry has been received."
    assert body["reference"].startswith("VQ-")

    rows = isolate.read_all()
    assert len(rows) == 1
    assert rows[0]["email"] == "dana@example.com"
    assert rows[0]["service"] == "cloud-devops"
    assert rows[0]["reference"] == body["reference"]


def test_contact_minimal_payload_without_optionals(isolate):
    response = client.post(
        "/api/contact",
        json={
            "name": "Sam Reyes",
            "email": "sam@example.com",
            "message": "Interested in discussing a backend platform build with your team.",
        },
    )
    assert response.status_code == 201
    assert isolate.read_all()[0]["company"] is None


def test_references_are_unique(isolate):
    a = client.post("/api/contact", json=VALID).json()["reference"]
    b = client.post("/api/contact", json=VALID).json()["reference"]
    assert a != b


# ----------------------------------------------------------------- validation
@pytest.mark.parametrize(
    "patch",
    [
        {"email": "not-an-email"},
        {"name": "A"},                      # below min_length
        {"message": "too short"},           # below 20 chars
        {"service": "not-a-real-service"},  # outside the allowed set
        {"name": ""},
    ],
)
def test_invalid_payloads_rejected(patch, isolate):
    response = client.post("/api/contact", json={**VALID, **patch})
    assert response.status_code == 422
    assert isolate.read_all() == []


def test_missing_body_rejected(isolate):
    assert client.post("/api/contact", json={}).status_code == 422


def test_honeypot_submission_rejected(isolate):
    response = client.post(
        "/api/contact", json={**VALID, "company_website": "http://spam.example"}
    )
    assert response.status_code == 422
    assert isolate.read_all() == []


def test_control_characters_stripped(isolate):
    client.post("/api/contact", json={**VALID, "name": "Dana\x00\x07 Okafor"})
    assert isolate.read_all()[0]["name"] == "Dana Okafor"


def test_oversized_message_rejected(isolate):
    response = client.post("/api/contact", json={**VALID, "message": "x" * 4001})
    assert response.status_code == 422


# -------------------------------------------------------------- rate limiting
def test_rate_limit_blocks_after_configured_maximum(monkeypatch, isolate):
    monkeypatch.setattr(settings, "RATE_LIMIT_MAX_REQUESTS", 3)
    for _ in range(3):
        assert client.post("/api/contact", json=VALID).status_code == 201
    blocked = client.post("/api/contact", json=VALID)
    assert blocked.status_code == 429
    assert "wait a few minutes" in blocked.json()["detail"]
    assert len(isolate.read_all()) == 3


def test_rate_limit_is_configurable(monkeypatch, isolate):
    monkeypatch.setattr(settings, "RATE_LIMIT_MAX_REQUESTS", 1)
    assert client.post("/api/contact", json=VALID).status_code == 201
    assert client.post("/api/contact", json=VALID).status_code == 429


def test_forwarded_for_ignored_when_no_proxy_declared(monkeypatch, isolate):
    """A spoofed X-Forwarded-For must not buy a fresh quota."""
    monkeypatch.setattr(settings, "RATE_LIMIT_MAX_REQUESTS", 2)
    monkeypatch.setattr(settings, "TRUSTED_PROXY_COUNT", 0)
    for _ in range(2):
        assert client.post("/api/contact", json=VALID).status_code == 201
    spoofed = client.post(
        "/api/contact", json=VALID, headers={"X-Forwarded-For": "203.0.113.99"}
    )
    assert spoofed.status_code == 429


def test_forwarded_for_used_when_one_proxy_declared(monkeypatch, isolate):
    monkeypatch.setattr(settings, "RATE_LIMIT_MAX_REQUESTS", 1)
    monkeypatch.setattr(settings, "TRUSTED_PROXY_COUNT", 1)
    a = client.post("/api/contact", json=VALID, headers={"X-Forwarded-For": "198.51.100.1"})
    b = client.post("/api/contact", json=VALID, headers={"X-Forwarded-For": "198.51.100.2"})
    assert a.status_code == 201
    assert b.status_code == 201  # different client → own bucket
    c = client.post("/api/contact", json=VALID, headers={"X-Forwarded-For": "198.51.100.1"})
    assert c.status_code == 429


def test_forwarded_for_takes_rightmost_trusted_hop(monkeypatch, isolate):
    """With one trusted proxy, a caller-supplied left-hand hop is ignored."""
    monkeypatch.setattr(settings, "RATE_LIMIT_MAX_REQUESTS", 1)
    monkeypatch.setattr(settings, "TRUSTED_PROXY_COUNT", 1)
    # Attacker forges a leading hop; the real client is the rightmost entry.
    first = client.post(
        "/api/contact", json=VALID, headers={"X-Forwarded-For": "1.1.1.1, 198.51.100.7"}
    )
    second = client.post(
        "/api/contact", json=VALID, headers={"X-Forwarded-For": "2.2.2.2, 198.51.100.7"}
    )
    assert first.status_code == 201
    assert second.status_code == 429  # same real client despite a new left hop


def test_limiter_window_expiry_releases_quota():
    limiter = rate_limit.InMemoryRateLimiter(max_requests=1, window_seconds=0)
    assert asyncio.run(limiter.allow("k")) is True
    assert asyncio.run(limiter.allow("k")) is True  # window already elapsed


# --------------------------------------------------------------------- CORS
ALLOWED_ORIGIN = "http://localhost:3000"
FOREIGN_ORIGIN = "https://evil.example"


def test_cors_allows_the_configured_website_origin(isolate):
    response = client.options(
        "/api/contact",
        headers={
            "Origin": ALLOWED_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ALLOWED_ORIGIN


def test_cors_rejects_unauthorized_origin_preflight(isolate):
    """An unknown origin must not receive an allow-origin header."""
    response = client.options(
        "/api/contact",
        headers={
            "Origin": FOREIGN_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert "access-control-allow-origin" not in response.headers


def test_cors_does_not_echo_unauthorized_origin_on_real_request(isolate):
    response = client.post("/api/contact", json=VALID, headers={"Origin": FOREIGN_ORIGIN})
    assert response.headers.get("access-control-allow-origin") != FOREIGN_ORIGIN
    assert "access-control-allow-origin" not in response.headers


def test_credentials_are_never_allowed(isolate):
    """allow_credentials must stay off — it is what made '*' dangerous."""
    response = client.options(
        "/api/contact",
        headers={
            "Origin": ALLOWED_ORIGIN,
            "Access-Control-Request-Method": "POST",
        },
    )
    assert "access-control-allow-credentials" not in response.headers


def test_wildcard_origin_is_rejected_by_config():
    from app.config import Settings

    with pytest.raises(ValueError, match="exact origins"):
        Settings(ALLOWED_ORIGINS="*")


def test_empty_origins_rejected_by_config():
    from app.config import Settings

    with pytest.raises(ValueError, match="empty"):
        Settings(ALLOWED_ORIGINS="")


def test_plaintext_origin_rejected_in_production():
    from app.config import Settings

    with pytest.raises(ValueError, match="plaintext"):
        Settings(ENVIRONMENT="production", ALLOWED_ORIGINS="http://vortiqen.com")


# ------------------------------------------------- delivery policy / failures
def test_production_without_any_channel_refuses_to_claim_success(monkeypatch, isolate):
    """The silent-success bug: must now be a 502, not a cheerful 201."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "ALLOW_LOCAL_PERSISTENCE_IN_PRODUCTION", False)

    response = client.post("/api/contact", json=VALID)
    assert response.status_code == 502
    assert response.json()["detail"] == (
        "Something went wrong while sending your enquiry. Please try again."
    )
    # The record is still kept so the enquiry is not lost.
    assert len(isolate.read_all()) == 1


def test_production_with_failing_webhook_returns_error(monkeypatch, isolate):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "NOTIFICATION_WEBHOOK_URL", "https://hook.example/x")

    async def failing(payload, reference):
        return "failed"

    monkeypatch.setattr(notifications.notification_service, "send_webhook", failing)

    response = client.post("/api/contact", json=VALID)
    assert response.status_code == 502


def test_production_with_working_webhook_succeeds(monkeypatch, isolate):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "NOTIFICATION_WEBHOOK_URL", "https://hook.example/x")

    async def ok(payload, reference):
        return "ok"

    monkeypatch.setattr(notifications.notification_service, "send_webhook", ok)

    response = client.post("/api/contact", json=VALID)
    assert response.status_code == 201
    assert response.json()["success"] is True


def test_production_local_opt_in_allows_success(monkeypatch, isolate):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "ALLOW_LOCAL_PERSISTENCE_IN_PRODUCTION", True)
    assert client.post("/api/contact", json=VALID).status_code == 201


def test_storage_failure_in_development_returns_error(monkeypatch, isolate):
    async def broken(payload, reference):
        return False

    monkeypatch.setattr(isolate, "append", broken)
    response = client.post("/api/contact", json=VALID)
    assert response.status_code == 502


def test_unexpected_exception_is_not_leaked(monkeypatch, isolate):
    async def explode(payload):
        raise RuntimeError("secret internal detail: db://user:pass@host")

    monkeypatch.setattr(enquiries.enquiry_service, "submit", explode)
    response = client.post("/api/contact", json=VALID)
    assert response.status_code == 502
    assert "secret internal detail" not in response.text
    assert response.json()["detail"] == (
        "Something went wrong while sending your enquiry. Please try again."
    )


# ------------------------------------------------------------------ misc
def test_removed_student_routes_are_gone(isolate):
    assert client.post("/api/submit-requirement", json={}).status_code == 404
    assert client.post("/api/quick-contact", json={}).status_code == 404


def test_metrics_endpoint_returns_prometheus_data():
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "vortiqen_http_requests_total" in response.text


def test_security_headers_present_on_responses():
    response = client.get("/api/health")
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "X-Request-ID" in response.headers
