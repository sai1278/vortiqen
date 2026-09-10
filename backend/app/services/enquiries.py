from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Dict

from app.config import settings
from app.schemas import ContactCreate
from app.services.notifications import ChannelState, notification_service
from app.services.storage import enquiry_store

logger = logging.getLogger("uvicorn.error")


@dataclass
class SubmissionOutcome:
    """Result of handling one enquiry.

    ``delivered`` is the only thing the route may use to decide what to tell
    the visitor. Everything else is for logs and /api/health.
    """

    delivered: bool
    reference: str
    stored: bool = False
    channels: Dict[str, ChannelState] = field(default_factory=dict)
    reason: str = ""


class EnquiryService:
    """
    Applies Vortiqen's delivery policy to an enquiry.

    The policy exists because the previous implementation returned 201 with
    "registered successfully — check your email" while Google Sheets was in
    dry-run, SMTP was unset and the webhook was empty. An enquiry that reaches
    nobody must never be reported as received.

    Policy
    ------
    development / staging
        The durable local JSONL file is an acceptable destination. Configured
        external channels are still attempted, and a failure is logged, but it
        does not fail the request — the enquiry is safe on disk.

    production
        At least one *external* channel (webhook or SMTP) must succeed, unless
        the operator has explicitly set
        ``ALLOW_LOCAL_PERSISTENCE_IN_PRODUCTION=true``. If nothing is
        configured at all, the request fails fast and loudly.
    """

    async def submit(self, payload: ContactCreate) -> SubmissionOutcome:
        reference = enquiry_store.new_reference()

        # 1. Durability first. Even when an external channel is the official
        #    destination, we want the record on disk before we attempt it.
        stored = await enquiry_store.append(payload, reference)
        if not stored:
            logger.error("Enquiry %s could not be persisted", reference)

        # 2. Fan out to configured channels.
        channels = await notification_service.dispatch(payload, reference)
        external_ok = any(state == "ok" for state in channels.values())
        external_failed = [
            name for name, state in channels.items() if state == "failed"
        ]

        if external_failed:
            logger.error(
                "Enquiry %s: channel(s) failed: %s",
                reference,
                ", ".join(external_failed),
            )

        # 3. Apply the policy.
        # If relational database is configured and write succeeded, lead is safely persisted.
        if settings.database_configured and stored:
            return SubmissionOutcome(
                delivered=True,
                reference=reference,
                stored=stored,
                channels=channels,
            )

        if settings.is_production and not settings.ALLOW_LOCAL_PERSISTENCE_IN_PRODUCTION:
            if not settings.external_channel_configured:
                logger.critical(
                    "Enquiry %s REJECTED: no external delivery channel or database is configured "
                    "in production. Set DATABASE_URL, NOTIFICATION_WEBHOOK_URL or SMTP_*, or set "
                    "ALLOW_LOCAL_PERSISTENCE_IN_PRODUCTION=true to accept the local store.",
                    reference,
                )
                return SubmissionOutcome(
                    delivered=False,
                    reference=reference,
                    stored=stored,
                    channels=channels,
                    reason="no_channel_configured",
                )
            if not external_ok:
                logger.error(
                    "Enquiry %s NOT DELIVERED: every configured channel failed "
                    "(stored locally=%s)",
                    reference,
                    stored,
                )
                return SubmissionOutcome(
                    delivered=False,
                    reference=reference,
                    stored=stored,
                    channels=channels,
                    reason="all_channels_failed",
                )
            return SubmissionOutcome(
                delivered=True,
                reference=reference,
                stored=stored,
                channels=channels,
            )

        # development / staging, or explicit local opt-in in production.
        if not stored and not external_ok:
            logger.error(
                "Enquiry %s NOT DELIVERED: local store failed and no channel succeeded",
                reference,
            )
            return SubmissionOutcome(
                delivered=False,
                reference=reference,
                stored=stored,
                channels=channels,
                reason="storage_failed",
            )

        if not settings.external_channel_configured:
            # Loud in the log, silent to the visitor — their enquiry *is* safe.
            logger.warning(
                "Enquiry %s stored locally at %s; no external channel configured "
                "(acceptable in %s, not in production)",
                reference,
                enquiry_store.path,
                settings.ENVIRONMENT,
            )

        return SubmissionOutcome(
            delivered=True,
            reference=reference,
            stored=stored,
            channels=channels,
        )


enquiry_service = EnquiryService()
