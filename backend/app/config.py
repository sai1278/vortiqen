from __future__ import annotations

import logging
from typing import List, Literal, Optional

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger("uvicorn.error")


class Settings(BaseSettings):
    """
    Vortiqen API configuration.

    Every value is environment-driven; nothing here carries a real secret.
    Defaults are deliberately *fail-safe* rather than fail-open:

    * ``ENVIRONMENT`` defaults to ``production``. A deployment that forgets to
      set it therefore gets the strict delivery policy and refuses to report
      success it cannot back up, instead of silently writing to a local file.
      Local development sets ``ENVIRONMENT=development`` in ``.env``.
    * ``ALLOWED_ORIGINS`` defaults to the local dev origin only — never ``*``.
    * ``TRUSTED_PROXY_COUNT`` defaults to 0, so forwarded-for headers are not
      trusted until an operator states how many proxies sit in front.
    """

    APP_NAME: str = "Vortiqen API"
    ENVIRONMENT: Literal["development", "staging", "production"] = "production"

    # --- CORS -------------------------------------------------------------
    # Comma-separated exact origins. Wildcards are rejected outright: the API
    # is called cross-origin by the website only, and never with credentials.
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    # --- Persistence ------------------------------------------------------
    # Relational database URL (PostgreSQL in production, e.g. postgresql+asyncpg://user:pass@host:5432/dbname).
    DATABASE_URL: Optional[str] = None

    # Append-only JSONL record of enquiries (local development fallback).
    ENQUIRY_STORE_PATH: str = "data/enquiries.jsonl"

    # In production the local file alone is NOT accepted as delivery unless an
    # operator explicitly opts in. Otherwise an unconfigured deployment would
    # be right back to reporting success for an enquiry nobody will ever read.
    ALLOW_LOCAL_PERSISTENCE_IN_PRODUCTION: bool = False

    # --- Outbound notification channels ----------------------------------
    # Slack / Discord / Zapier / custom endpoint
    NOTIFICATION_WEBHOOK_URL: Optional[str] = None
    NOTIFICATION_WEBHOOK_TIMEOUT_SECONDS: float = 8.0

    # Baserow Table API integration (server-side)
    BASEROW_TABLE_URL: Optional[str] = None
    BASEROW_API_TOKEN: Optional[str] = None
    BASEROW_TIMEOUT_SECONDS: float = 8.0

    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_STARTTLS: bool = True
    SENDER_EMAIL: Optional[str] = None
    TEAM_INBOX: Optional[str] = None

    # --- Rate limiting ----------------------------------------------------
    RATE_LIMIT_WINDOW_SECONDS: int = 600
    RATE_LIMIT_MAX_REQUESTS: int = 5

    # Number of trusted reverse proxies in front of this app. 0 means the
    # X-Forwarded-For header is ignored entirely and the socket peer is used.
    # See docs/reverse-proxy notes in .env.example.
    TRUSTED_PROXY_COUNT: int = 0

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ------------------------------------------------------------------ CORS
    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    # ------------------------------------------------------- delivery policy
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def database_configured(self) -> bool:
        return bool(self.DATABASE_URL)

    @property
    def webhook_configured(self) -> bool:
        return bool(self.NOTIFICATION_WEBHOOK_URL)

    @property
    def baserow_configured(self) -> bool:
        return bool(self.BASEROW_TABLE_URL and self.BASEROW_API_TOKEN)

    @property
    def smtp_configured(self) -> bool:
        return bool(self.SMTP_HOST and self.SENDER_EMAIL and self.TEAM_INBOX)

    @property
    def external_channel_configured(self) -> bool:
        return self.webhook_configured or self.smtp_configured or self.baserow_configured

    @property
    def local_store_counts_as_delivery(self) -> bool:
        """The local JSONL file is only a valid destination outside production,
        or when an operator has explicitly accepted it."""
        if not self.is_production:
            return True
        return self.ALLOW_LOCAL_PERSISTENCE_IN_PRODUCTION

    @property
    def can_accept_enquiries(self) -> bool:
        """False means /api/contact will fail fast rather than lie."""
        return (
            self.database_configured
            or self.external_channel_configured
            or self.local_store_counts_as_delivery
        )

    # -------------------------------------------------------- validation
    @model_validator(mode="after")
    def _validate(self) -> "Settings":
        origins = self.cors_origins

        if "*" in origins:
            raise ValueError(
                "ALLOWED_ORIGINS must list exact origins; '*' is not permitted. "
                "Set the website origin, e.g. https://vortiqen.com"
            )

        if not origins:
            raise ValueError(
                "ALLOWED_ORIGINS is empty. Set at least one exact origin."
            )

        if self.is_production:
            for origin in origins:
                if origin.startswith("http://") and not origin.startswith(
                    ("http://localhost", "http://127.0.0.1")
                ):
                    raise ValueError(
                        f"Refusing plaintext origin {origin!r} in production; use https://"
                    )

        if self.TRUSTED_PROXY_COUNT < 0:
            raise ValueError("TRUSTED_PROXY_COUNT cannot be negative.")

        return self


settings = Settings()
