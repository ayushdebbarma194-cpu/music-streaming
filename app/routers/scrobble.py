"""
Module 5 — Scrobbling
Implements Last.fm Audioscrobbler 2.0 API and ListenBrainz submit-listens.
Both services are called if configured; a failure in one doesn't block the other.
"""

import hashlib
import time
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.http_client import get_http_client

router = APIRouter()

# Last.fm session key (obtained via auth.getMobileSession)
_lastfm_session_key: Optional[str] = None

LASTFM_API_URL = "https://ws.audioscrobbler.com/2.0/"
LISTENBRAINZ_API_URL = "https://api.listenbrainz.org/1/submit-listens"


class NowPlayingRequest(BaseModel):
    title: str
    artist: str
    album: Optional[str] = None
    duration: Optional[int] = None  # seconds


class ScrobbleRequest(BaseModel):
    title: str
    artist: str
    album: Optional[str] = None
    duration: Optional[int] = None  # seconds
    timestamp: Optional[int] = None  # Unix timestamp


# ─── Endpoints ───────────────────────────────────────────────────

@router.post("/scrobble/nowplaying")
async def now_playing(request: NowPlayingRequest):
    """Send now-playing notification to all configured scrobble services."""
    results = {}

    if settings.lastfm_configured:
        try:
            results["lastfm"] = await _lastfm_now_playing(
                request.title, request.artist, request.album, request.duration
            )
        except Exception as e:
            results["lastfm"] = {"error": str(e)}

    if settings.listenbrainz_configured:
        try:
            results["listenbrainz"] = await _listenbrainz_now_playing(
                request.title, request.artist, request.album, request.duration
            )
        except Exception as e:
            results["listenbrainz"] = {"error": str(e)}

    if not settings.lastfm_configured and not settings.listenbrainz_configured:
        return {"status": "no_services_configured", "results": {}}

    return {"status": "ok", "results": results}


@router.post("/scrobble/submit")
async def scrobble_submit(request: ScrobbleRequest):
    """Submit a scrobble to all configured services."""
    timestamp = request.timestamp or int(time.time())
    results = {}

    if settings.lastfm_configured:
        try:
            results["lastfm"] = await _lastfm_scrobble(
                request.title, request.artist, request.album, request.duration, timestamp
            )
        except Exception as e:
            results["lastfm"] = {"error": str(e)}

    if settings.listenbrainz_configured:
        try:
            results["listenbrainz"] = await _listenbrainz_scrobble(
                request.title, request.artist, request.album, request.duration, timestamp
            )
        except Exception as e:
            results["listenbrainz"] = {"error": str(e)}

    if not settings.lastfm_configured and not settings.listenbrainz_configured:
        return {"status": "no_services_configured", "results": {}}

    return {"status": "ok", "results": results}


# ─── Public helpers for playback integration ─────────────────────

async def notify_now_playing(title: str, artist: str, duration: float = 0):
    """Called by the playback module when a track starts."""
    if not title:
        return
    request = NowPlayingRequest(
        title=title, artist=artist, duration=int(duration) if duration else None
    )
    await now_playing(request)


async def submit_scrobble(title: str, artist: str, duration: int = 0, timestamp: int = 0):
    """Called by the playback module when scrobble threshold is reached."""
    if not title:
        return
    request = ScrobbleRequest(
        title=title, artist=artist, duration=duration, timestamp=timestamp or int(time.time())
    )
    await scrobble_submit(request)


# ─── Last.fm Implementation ──────────────────────────────────────

def _lastfm_sign(params: dict) -> str:
    """Generate Last.fm API signature (md5 of sorted params + secret)."""
    sorted_params = sorted(params.items())
    sig_string = "".join(f"{k}{v}" for k, v in sorted_params)
    sig_string += settings.lastfm_api_secret or ""
    return hashlib.md5(sig_string.encode("utf-8")).hexdigest()


async def _lastfm_get_session() -> str:
    """Get or create a Last.fm session via auth.getMobileSession."""
    global _lastfm_session_key
    if _lastfm_session_key:
        return _lastfm_session_key

    if not settings.lastfm_username or not settings.lastfm_password:
        raise Exception("Last.fm username/password not configured")

    client = get_http_client()
    params = {
        "method": "auth.getMobileSession",
        "api_key": settings.lastfm_api_key,
        "username": settings.lastfm_username,
        "password": settings.lastfm_password,
    }
    params["api_sig"] = _lastfm_sign(params)
    params["format"] = "json"

    resp = await client.post(LASTFM_API_URL, data=params)
    data = resp.json()

    if "session" in data:
        _lastfm_session_key = data["session"]["key"]
        return _lastfm_session_key
    else:
        error_msg = data.get("error", {})
        raise Exception(f"Last.fm auth failed: {data.get('message', error_msg)}")


async def _lastfm_now_playing(
    title: str, artist: str, album: Optional[str] = None, duration: Optional[int] = None
) -> dict:
    """Send track.updateNowPlaying to Last.fm."""
    session_key = await _lastfm_get_session()
    client = get_http_client()

    params = {
        "method": "track.updateNowPlaying",
        "api_key": settings.lastfm_api_key,
        "sk": session_key,
        "artist": artist,
        "track": title,
    }
    if album:
        params["album"] = album
    if duration:
        params["duration"] = str(duration)

    params["api_sig"] = _lastfm_sign(params)
    params["format"] = "json"

    resp = await client.post(LASTFM_API_URL, data=params)
    return resp.json()


async def _lastfm_scrobble(
    title: str, artist: str, album: Optional[str] = None,
    duration: Optional[int] = None, timestamp: int = 0
) -> dict:
    """Send track.scrobble to Last.fm."""
    session_key = await _lastfm_get_session()
    client = get_http_client()

    params = {
        "method": "track.scrobble",
        "api_key": settings.lastfm_api_key,
        "sk": session_key,
        "artist": artist,
        "track": title,
        "timestamp": str(timestamp),
    }
    if album:
        params["album"] = album
    if duration:
        params["duration"] = str(duration)

    params["api_sig"] = _lastfm_sign(params)
    params["format"] = "json"

    resp = await client.post(LASTFM_API_URL, data=params)
    return resp.json()


# ─── ListenBrainz Implementation ────────────────────────────────

async def _listenbrainz_now_playing(
    title: str, artist: str, album: Optional[str] = None, duration: Optional[int] = None
) -> dict:
    """Send playing_now to ListenBrainz."""
    client = get_http_client()

    track_metadata = {
        "artist_name": artist,
        "track_name": title,
    }
    if album:
        track_metadata["release_name"] = album
    if duration:
        track_metadata["additional_info"] = {"duration_ms": duration * 1000}

    payload = {
        "listen_type": "playing_now",
        "payload": [
            {
                "track_metadata": track_metadata,
            }
        ],
    }

    # Add submission_client per ListenBrainz convention
    if "additional_info" not in track_metadata:
        track_metadata["additional_info"] = {}
    track_metadata["additional_info"]["submission_client"] = "ArchiveTune-Linux-Backend"

    resp = await client.post(
        LISTENBRAINZ_API_URL,
        json=payload,
        headers={
            "Authorization": f"Token {settings.listenbrainz_token}",
            "Content-Type": "application/json",
        },
    )
    return resp.json()


async def _listenbrainz_scrobble(
    title: str, artist: str, album: Optional[str] = None,
    duration: Optional[int] = None, timestamp: int = 0
) -> dict:
    """Send single listen to ListenBrainz."""
    client = get_http_client()

    track_metadata = {
        "artist_name": artist,
        "track_name": title,
        "additional_info": {
            "submission_client": "ArchiveTune-Linux-Backend",
        },
    }
    if album:
        track_metadata["release_name"] = album
    if duration:
        track_metadata["additional_info"]["duration_ms"] = duration * 1000

    payload = {
        "listen_type": "single",
        "payload": [
            {
                "listened_at": timestamp,
                "track_metadata": track_metadata,
            }
        ],
    }

    resp = await client.post(
        LISTENBRAINZ_API_URL,
        json=payload,
        headers={
            "Authorization": f"Token {settings.listenbrainz_token}",
            "Content-Type": "application/json",
        },
    )
    return resp.json()
