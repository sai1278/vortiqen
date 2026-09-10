from __future__ import annotations

import asyncio
import logging
import time
from collections import defaultdict, deque
from typing import Deque, Dict, Optional, Protocol

from fastapi import Request

from app.config import settings

logger = logging.getLogger("uvicorn.error")


def client_identifier(request: Request) -> str:
    """
    Derive the rate-limit key for a request.

    Forwarded-for headers are attacker-controlled, so they are only consulted
    when an operator has declared how many reverse proxies sit in front of the
    app via ``TRUSTED_PROXY_COUNT``.

    With ``TRUSTED_PROXY_COUNT = 0`` (the default) the header is ignored
    entirely and the socket peer address is used.

    With ``TRUSTED_PROXY_COUNT = n`` the client is the (n+1)-th entry counting
    from the *right* of ``X-Forwarded-For``. Only the rightmost n entries were
    appended by infrastructure we control; anything further left was supplied
    by the caller and can be forged. Taking the leftmost entry — the common
    mistake — lets anyone set ``X-Forwarded-For: <random>`` and get a fresh
    quota on every request.

    Reverse-proxy note: if you deploy behind one proxy (nginx, Cloudflare, an
    ALB), set TRUSTED_PROXY_COUNT=1 *and* make sure that proxy appends to
    X-Forwarded-For rather than replacing it. Leaving it at 0 behind a proxy is
    safe but coarse — every visitor shares the proxy's address as one bucket.
    """
    trusted = settings.TRUSTED_PROXY_COUNT

    if trusted > 0:
        forwarded = request.headers.get("x-forwarded-for", "")
        if forwarded:
            hops = [h.strip() for h in forwarded.split(",") if h.strip()]
            if len(hops) >= trusted:
                candidate = hops[-trusted]
                if candidate:
                    return candidate
            # Fewer hops than declared: the chain is not what we expect, so
            # fall through to the socket peer instead of trusting it.
            logger.warning(
                "X-Forwarded-For has %d hop(s) but TRUSTED_PROXY_COUNT=%d; "
                "falling back to peer address",
                len(hops),
                trusted,
            )

    return request.client.host if request.client else "unknown"


class RateLimiter(Protocol):
    """Narrow interface so the in-process limiter can be swapped for a shared
    one (Redis, or the proxy's own limiter) without touching route code."""

    async def allow(self, key: str) -> bool: ...

    async def reset(self) -> None: ...


class InMemoryRateLimiter:
    """
    Sliding-window limiter held in this process.

    Adequate for a single-instance deployment of a contact form. It is *not*
    shared across workers or replicas, and it resets on restart — so it is a
    speed bump against casual abuse, not a security control. Real protection
    belongs at the edge (proxy / WAF); this keeps a single bad actor from
    filling the enquiry store between deploys.

    Swap in a shared implementation of ``RateLimiter`` when the app is scaled
    beyond one process.
    """

    def __init__(self, max_requests: Optional[int] = None, window_seconds: Optional[int] = None):
        self._max = max_requests
        self._window = window_seconds
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    @property
    def max_requests(self) -> int:
        return self._max if self._max is not None else settings.RATE_LIMIT_MAX_REQUESTS

    @property
    def window_seconds(self) -> int:
        return self._window if self._window is not None else settings.RATE_LIMIT_WINDOW_SECONDS

    async def allow(self, key: str) -> bool:
        now = time.monotonic()
        cutoff = now - self.window_seconds

        async with self._lock:
            bucket = self._hits[key]
            # Drop expired hits from the left of the window.
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()

            if len(bucket) >= self.max_requests:
                return False

            bucket.append(now)

            # Opportunistic cleanup so idle keys cannot grow unbounded and
            # turn the limiter itself into a memory-exhaustion vector.
            if len(self._hits) > 2048:
                stale = [k for k, v in self._hits.items() if not v or v[-1] < cutoff]
                for k in stale:
                    del self._hits[k]

            return True

    async def reset(self) -> None:
        async with self._lock:
            self._hits.clear()


rate_limiter: RateLimiter = InMemoryRateLimiter()
