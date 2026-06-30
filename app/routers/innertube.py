"""
Module 1 — Music source / playback resolution
Wraps the ytmusicapi library for YouTube Music's InnerTube API.
Provides search, song resolution, playlist/artist/album browsing.
Caches resolved stream URLs in SQLite with expiry.
"""

import time
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from ytmusicapi import YTMusic

from app.config import settings
from app.database import get_db

router = APIRouter()

# Initialize ytmusicapi — works without auth for basic browsing/search
_ytmusic: Optional[YTMusic] = None


def get_ytmusic() -> YTMusic:
    """Get or initialize the YTMusic client."""
    global _ytmusic
    if _ytmusic is None:
        if settings.ytmusic_auth_file:
            _ytmusic = YTMusic(settings.ytmusic_auth_file)
        else:
            _ytmusic = YTMusic()
    return _ytmusic


@router.get("/search")
async def search(
    q: str = Query(..., description="Search query"),
    type: Optional[str] = Query(None, description="Filter: songs|albums|artists|playlists"),
    limit: int = Query(20, ge=1, le=50),
):
    """
    Search YouTube Music catalog.
    Supports filtering by type: songs, albums, artists, playlists.
    """
    yt = get_ytmusic()

    # Map type parameter to ytmusicapi filter
    filter_map = {
        "songs": "songs",
        "albums": "albums",
        "artists": "artists",
        "playlists": "community_playlists",
    }
    yt_filter = filter_map.get(type) if type else None

    try:
        results = yt.search(q, filter=yt_filter, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"InnerTube search failed: {str(e)}")

    return {"query": q, "type": type, "results": results}


@router.get("/song/{video_id}")
async def get_song(video_id: str):
    """
    Get song metadata + resolved stream URL + expiry.
    Checks cache first, resolves via InnerTube if cache miss/expired.
    """
    db = await get_db()
    now = int(time.time())

    # Check cache
    cursor = await db.execute(
        "SELECT stream_url, mime_type, bitrate, itag, expires_at FROM stream_cache WHERE video_id = ? AND expires_at > ?",
        (video_id, now),
    )
    cached = await cursor.fetchone()

    if cached:
        stream_info = {
            "stream_url": cached[0],
            "mime_type": cached[1],
            "bitrate": cached[2],
            "itag": cached[3],
            "expires_at": cached[4],
            "cached": True,
        }
    else:
        # Resolve from InnerTube
        stream_info = await _resolve_stream(video_id)
        stream_info["cached"] = False

        # Cache the result
        await db.execute(
            """INSERT OR REPLACE INTO stream_cache (video_id, stream_url, mime_type, bitrate, itag, expires_at, cached_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                video_id,
                stream_info["stream_url"],
                stream_info.get("mime_type"),
                stream_info.get("bitrate"),
                stream_info.get("itag"),
                stream_info["expires_at"],
                now,
            ),
        )
        await db.commit()

    # Get song metadata
    yt = get_ytmusic()
    try:
        song_info = yt.get_song(video_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to get song info: {str(e)}")

    # Extract useful metadata from the response
    video_details = song_info.get("videoDetails", {})
    metadata = {
        "video_id": video_id,
        "title": video_details.get("title"),
        "artist": video_details.get("author"),
        "duration_seconds": int(video_details.get("lengthSeconds", 0)),
        "thumbnail": video_details.get("thumbnail", {}).get("thumbnails", [{}])[-1].get("url") if video_details.get("thumbnail") else None,
        "is_live": video_details.get("isLiveContent", False),
    }

    return {**metadata, **stream_info}


@router.get("/song/{video_id}/lyrics")
async def get_song_lyrics(video_id: str):
    """
    Get lyrics for a song. Proxies to the lyrics waterfall (Module 4).
    """
    # This endpoint delegates to the lyrics module
    from app.routers.lyrics import fetch_lyrics_waterfall

    yt = get_ytmusic()
    try:
        song_info = yt.get_song(video_id)
        video_details = song_info.get("videoDetails", {})
        title = video_details.get("title", "")
        artist = video_details.get("author", "")
    except Exception:
        title = ""
        artist = ""

    result = await fetch_lyrics_waterfall(title=title, artist=artist, video_id=video_id)
    return result


@router.get("/playlist/{playlist_id}")
async def get_playlist(playlist_id: str, limit: int = Query(100, ge=1, le=500)):
    """Get playlist details and tracks."""
    yt = get_ytmusic()
    try:
        playlist = yt.get_playlist(playlist_id, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to get playlist: {str(e)}")
    return playlist


@router.get("/artist/{artist_id}")
async def get_artist(artist_id: str):
    """Get artist details and top songs/albums."""
    yt = get_ytmusic()
    try:
        artist = yt.get_artist(artist_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to get artist: {str(e)}")
    return artist


@router.get("/album/{album_id}")
async def get_album(album_id: str):
    """Get album details and tracks."""
    yt = get_ytmusic()
    try:
        album = yt.get_album(album_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to get album: {str(e)}")
    return album


async def _resolve_stream(video_id: str) -> dict:
    """
    Resolve a playable stream URL for a video/song ID via InnerTube.
    Returns the best audio-only adaptive format.
    """
    yt = get_ytmusic()

    try:
        song_info = yt.get_song(video_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"InnerTube player request failed: {str(e)}")

    streaming_data = song_info.get("streamingData", {})
    adaptive_formats = streaming_data.get("adaptiveFormats", [])

    if not adaptive_formats:
        raise HTTPException(
            status_code=404,
            detail=f"No streaming data available for video_id={video_id}. "
                   "The content may be DRM-protected or unavailable in your region.",
        )

    # Filter for audio-only formats and pick the highest bitrate
    audio_formats = [
        f for f in adaptive_formats
        if f.get("mimeType", "").startswith("audio/")
    ]

    if not audio_formats:
        raise HTTPException(
            status_code=404,
            detail="No audio streams found in adaptive formats.",
        )

    # Sort by bitrate (highest first)
    audio_formats.sort(key=lambda f: f.get("bitrate", 0), reverse=True)
    best = audio_formats[0]

    # Calculate expiry (InnerTube stream URLs typically expire after ~6 hours)
    # The URL contains an 'expire' parameter
    stream_url = best.get("url", "")
    if not stream_url:
        # Some formats use signatureCipher instead of direct URL
        raise HTTPException(
            status_code=502,
            detail="Stream URL requires signature deciphering. "
                   "Try authenticating with a browser.json auth file.",
        )

    # Parse expiry from URL or default to 6 hours from now
    expires_at = int(time.time()) + 6 * 3600
    try:
        from urllib.parse import urlparse, parse_qs
        parsed = urlparse(stream_url)
        params = parse_qs(parsed.query)
        if "expire" in params:
            expires_at = int(params["expire"][0])
    except (ValueError, KeyError, IndexError):
        pass

    return {
        "stream_url": stream_url,
        "mime_type": best.get("mimeType"),
        "bitrate": best.get("bitrate"),
        "itag": best.get("itag"),
        "expires_at": expires_at,
    }
