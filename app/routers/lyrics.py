"""
Module 4 — Lyrics waterfall
Tries multiple lyrics sources in order until one succeeds, then caches the result.
Waterfall order: Kugou → SimpMusic → YouTube captions → (Musixmatch/Spotify stubbed)
"""

import hashlib
import json
import time
from typing import List, Optional

from fastapi import APIRouter, Query

from app.database import get_db
from app.http_client import get_http_client

router = APIRouter()


@router.get("/lyrics")
async def get_lyrics(
    title: str = Query("", description="Song title"),
    artist: str = Query("", description="Artist name"),
    video_id: str = Query("", description="YouTube video ID (for captions fallback)"),
):
    """
    Get lyrics for a song. Runs the waterfall strategy:
    Kugou → SimpMusic → YouTube captions.
    Returns {source, synced, lines} or plain text if unsynced.
    """
    return await fetch_lyrics_waterfall(title=title, artist=artist, video_id=video_id)


async def fetch_lyrics_waterfall(
    title: str = "", artist: str = "", video_id: str = ""
) -> dict:
    """
    Main lyrics waterfall logic — tries sources in order, caches results.
    """
    # Check cache first
    cache_key = _make_cache_key(title, artist, video_id)
    db = await get_db()
    cursor = await db.execute(
        "SELECT source, synced, content FROM lyrics_cache WHERE cache_key = ?",
        (cache_key,),
    )
    cached = await cursor.fetchone()
    if cached:
        content = json.loads(cached[2])
        return {
            "source": cached[0],
            "synced": bool(cached[1]),
            "lines": content.get("lines", []),
            "plain_text": content.get("plain_text"),
            "cached": True,
        }

    # Waterfall: try each source
    result = None

    # 1. Kugou
    if title and artist:
        result = await _try_kugou(title, artist)

    # 2. SimpMusic API
    if result is None and title:
        result = await _try_simpmusic(title, artist)

    # 3. YouTube captions
    if result is None and video_id:
        result = await _try_youtube_captions(video_id)

    # 4. Musixmatch (stubbed)
    # 5. Spotify (stubbed)

    if result is None:
        return {
            "source": None,
            "synced": False,
            "lines": [],
            "plain_text": None,
            "cached": False,
            "error": "No lyrics found from any source",
        }

    # Cache the result
    content_json = json.dumps({
        "lines": result.get("lines", []),
        "plain_text": result.get("plain_text"),
    })
    await db.execute(
        "INSERT OR REPLACE INTO lyrics_cache (cache_key, source, synced, content, cached_at) VALUES (?, ?, ?, ?, ?)",
        (cache_key, result["source"], int(result["synced"]), content_json, int(time.time())),
    )
    await db.commit()

    result["cached"] = False
    return result


def _make_cache_key(title: str, artist: str, video_id: str) -> str:
    """Create a cache key from title+artist or video_id."""
    raw = f"{title.lower().strip()}|{artist.lower().strip()}|{video_id.strip()}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


# ─── Source 1: Kugou ─────────────────────────────────────────────

async def _try_kugou(title: str, artist: str) -> Optional[dict]:
    """Try to fetch lyrics from Kugou."""
    client = get_http_client()

    try:
        # Search for the song
        search_url = "https://mobileservice.kugou.com/api/v3/search/song"
        search_params = {
            "keyword": f"{title} {artist}",
            "page": 1,
            "pagesize": 5,
        }
        search_resp = await client.get(search_url, params=search_params)
        if search_resp.status_code != 200:
            return None

        search_data = search_resp.json()
        songs = search_data.get("data", {}).get("info", [])
        if not songs:
            return None

        # Get the first match's hash
        song = songs[0]
        song_hash = song.get("hash", "")
        if not song_hash:
            return None

        # Fetch lyrics using the hash
        lyrics_url = "https://lyrics.kugou.com/download"
        lyrics_params = {
            "ver": 1,
            "client": "pc",
            "id": song.get("hash", ""),
            "accesstoken": "",
            "fmt": "lrc",
            "charset": "utf8",
        }

        # First search for lyrics candidates
        search_lyrics_url = "https://lyrics.kugou.com/search"
        search_lyrics_params = {
            "ver": 1,
            "man": "yes",
            "client": "pc",
            "keyword": f"{title} - {artist}",
            "duration": song.get("duration", 0) * 1000,
            "hash": song_hash,
        }
        lyrics_search_resp = await client.get(search_lyrics_url, params=search_lyrics_params)
        if lyrics_search_resp.status_code != 200:
            return None

        lyrics_search_data = lyrics_search_resp.json()
        candidates = lyrics_search_data.get("candidates", [])
        if not candidates:
            return None

        # Download the first candidate
        candidate = candidates[0]
        download_params = {
            "ver": 1,
            "client": "pc",
            "id": candidate.get("id", ""),
            "accesstoken": candidate.get("accesstoken", ""),
            "fmt": "lrc",
            "charset": "utf8",
        }
        download_resp = await client.get(lyrics_url, params=download_params)
        if download_resp.status_code != 200:
            return None

        download_data = download_resp.json()
        lrc_content = download_data.get("content", "")

        if not lrc_content:
            return None

        # Parse LRC format
        import base64
        try:
            lrc_decoded = base64.b64decode(lrc_content).decode("utf-8")
        except Exception:
            lrc_decoded = lrc_content

        lines = _parse_lrc(lrc_decoded)

        return {
            "source": "kugou",
            "synced": len(lines) > 0,
            "lines": lines,
            "plain_text": lrc_decoded if not lines else None,
        }

    except Exception:
        return None


# ─── Source 2: SimpMusic ─────────────────────────────────────────

async def _try_simpmusic(title: str, artist: str) -> Optional[dict]:
    """Try to fetch lyrics from SimpMusic API (open, no auth)."""
    client = get_http_client()

    try:
        url = "https://api-lyrics.simpmusic.org/v1/"
        params = {"title": title, "artist": artist}
        resp = await client.get(url, params=params)

        if resp.status_code != 200:
            return None

        data = resp.json()

        # SimpMusic returns synced lyrics in LRC format or plain text
        lrc_content = data.get("lyrics", "")
        synced_lyrics = data.get("syncedLyrics", "")

        if synced_lyrics:
            lines = _parse_lrc(synced_lyrics)
            return {
                "source": "simpmusic",
                "synced": True,
                "lines": lines,
                "plain_text": None,
            }
        elif lrc_content:
            lines = _parse_lrc(lrc_content)
            if lines:
                return {
                    "source": "simpmusic",
                    "synced": True,
                    "lines": lines,
                    "plain_text": None,
                }
            else:
                return {
                    "source": "simpmusic",
                    "synced": False,
                    "lines": [],
                    "plain_text": lrc_content,
                }

        return None

    except Exception:
        return None


# ─── Source 3: YouTube Captions ──────────────────────────────────

async def _try_youtube_captions(video_id: str) -> Optional[dict]:
    """Fall back to YouTube captions/transcript for lyrics."""
    try:
        from app.routers.innertube import get_ytmusic

        yt = get_ytmusic()

        # Try to get watch playlist which may include lyrics
        try:
            watch_playlist = yt.get_watch_playlist(video_id)
            lyrics_browse_id = watch_playlist.get("lyrics")
            if lyrics_browse_id:
                lyrics_data = yt.get_lyrics(lyrics_browse_id)
                if lyrics_data and lyrics_data.get("lyrics"):
                    lyrics_text = lyrics_data["lyrics"]
                    # These are usually unsynced
                    lines = [
                        {"time_ms": None, "text": line}
                        for line in lyrics_text.split("\n")
                        if line.strip()
                    ]
                    return {
                        "source": "youtube",
                        "synced": False,
                        "lines": lines,
                        "plain_text": lyrics_text,
                    }
        except Exception:
            pass

        return None

    except Exception:
        return None


# ─── Source 4: Musixmatch (stubbed) ──────────────────────────────

async def _try_musixmatch(title: str, artist: str) -> Optional[dict]:
    """
    Musixmatch lyrics — STUBBED.
    Requires reverse-engineered tokens via PaxsenixLyrics proxy.
    Higher-effort/higher-fragility, deprioritized.
    """
    # TODO: Implement if needed in the future
    return None


# ─── Source 5: Spotify (stubbed) ─────────────────────────────────

async def _try_spotify(title: str, artist: str) -> Optional[dict]:
    """
    Spotify lyrics — STUBBED.
    Requires reverse-engineered session tokens.
    Higher-effort/higher-fragility, deprioritized.
    """
    # TODO: Implement if needed in the future
    return None


# ─── LRC Parser ──────────────────────────────────────────────────

def _parse_lrc(lrc_text: str) -> List[dict]:
    """
    Parse LRC (synced lyrics) format into a list of {time_ms, text}.
    LRC format: [MM:SS.xx]Text or [MM:SS.xxx]Text
    """
    import re

    lines = []
    pattern = re.compile(r'\[(\d{1,2}):(\d{2})\.(\d{2,3})\](.*)')

    for line in lrc_text.split("\n"):
        line = line.strip()
        match = pattern.match(line)
        if match:
            minutes = int(match.group(1))
            seconds = int(match.group(2))
            centiseconds = match.group(3)

            # Handle both .xx and .xxx formats
            if len(centiseconds) == 2:
                ms = int(centiseconds) * 10
            else:
                ms = int(centiseconds)

            time_ms = (minutes * 60 + seconds) * 1000 + ms
            text = match.group(4).strip()

            if text:  # Skip empty lines
                lines.append({"time_ms": time_ms, "text": text})

    return lines
