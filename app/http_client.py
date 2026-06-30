"""
ArchiveTune Backend — Shared HTTP Client
All HTTP calls go through a shared httpx.AsyncClient with reasonable timeouts
and a realistic User-Agent.
"""

from typing import Optional

import httpx

USER_AGENT = "ArchiveTune-Linux-Backend/0.1 (personal use)"

_client: Optional[httpx.AsyncClient] = None


def get_http_client() -> httpx.AsyncClient:
    """Get or create the shared async HTTP client."""
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=10.0),
            headers={"User-Agent": USER_AGENT},
            follow_redirects=True,
        )
    return _client


async def close_http_client():
    """Close the shared HTTP client."""
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None
