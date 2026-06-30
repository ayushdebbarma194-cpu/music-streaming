"""
Module 3 — Offline downloads
Replicates the original app's Media3 DownloadManager-backed offline cache.
Downloads audio streams to disk, tracks progress in SQLite, emits progress over WebSocket.
"""

import asyncio
import time
from pathlib import Path
from typing import Optional, List

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.config import settings
from app.database import get_db
from app.http_client import get_http_client

router = APIRouter()

# Download state constants
STATE_QUEUED = 0
STATE_DOWNLOADING = 1
STATE_COMPLETED = 2
STATE_FAILED = 3
STATE_REMOVING = 4

# WebSocket clients for download progress
_ws_clients: List[WebSocket] = []


class DownloadRequest(BaseModel):
    video_id: str


# ─── Endpoints ───────────────────────────────────────────────────

@router.post("/downloads")
async def start_download(request: DownloadRequest):
    """
    Start downloading a track for offline use.
    Resolves stream URL via Module 1, streams to disk, updates progress.
    """
    video_id = request.video_id
    db = await get_db()
    now_ms = int(time.time() * 1000)

    # Check if already downloaded
    cursor = await db.execute(
        "SELECT id, state FROM downloads WHERE id = ?", (video_id,)
    )
    existing = await cursor.fetchone()
    if existing and existing[1] == STATE_COMPLETED:
        return {"status": "already_downloaded", "id": video_id}
    if existing and existing[1] == STATE_DOWNLOADING:
        return {"status": "already_downloading", "id": video_id}

    # Resolve stream URL
    from app.routers.innertube import _resolve_stream, get_ytmusic
    try:
        stream_info = await _resolve_stream(video_id)
    except HTTPException as e:
        raise e

    stream_url = stream_info["stream_url"]
    mime_type = stream_info.get("mime_type", "audio/mp4")

    # Determine file extension from mime type
    ext_map = {
        "audio/mp4": ".m4a",
        "audio/webm": ".webm",
        "audio/ogg": ".ogg",
    }
    ext = ".m4a"
    for mime_prefix, extension in ext_map.items():
        if mime_type and mime_prefix in mime_type:
            ext = extension
            break

    # Create download directory
    download_dir = settings.download_path
    file_path = str(download_dir / f"{video_id}{ext}")

    # Insert download record
    await db.execute(
        """INSERT OR REPLACE INTO downloads
           (id, mime_type, uri, custom_cache_key, file_path, state, start_time_ms, update_time_ms, content_length, percent_downloaded, bytes_downloaded)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (video_id, mime_type, stream_url, video_id, file_path, STATE_QUEUED, now_ms, now_ms, 0, 0.0, 0),
    )
    await db.commit()

    # Start download in background
    asyncio.create_task(_download_file(video_id, stream_url, file_path))

    return {"status": "queued", "id": video_id, "file_path": file_path}


@router.get("/downloads")
async def list_downloads():
    """List all downloads with state/progress."""
    db = await get_db()
    cursor = await db.execute(
        "SELECT id, mime_type, uri, file_path, state, start_time_ms, update_time_ms, content_length, percent_downloaded, bytes_downloaded FROM downloads"
    )
    rows = await cursor.fetchall()

    state_names = {0: "queued", 1: "downloading", 2: "completed", 3: "failed", 4: "removing"}

    downloads = [
        {
            "id": row[0],
            "mime_type": row[1],
            "uri": row[2],
            "file_path": row[3],
            "state": row[4],
            "state_name": state_names.get(row[4], "unknown"),
            "start_time_ms": row[5],
            "update_time_ms": row[6],
            "content_length": row[7],
            "percent_downloaded": row[8],
            "bytes_downloaded": row[9],
        }
        for row in rows
    ]

    return {"downloads": downloads, "count": len(downloads)}


@router.delete("/downloads/{download_id}")
async def delete_download(download_id: str):
    """Remove a download — deletes file and database row."""
    db = await get_db()

    cursor = await db.execute(
        "SELECT file_path FROM downloads WHERE id = ?", (download_id,)
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Download not found")

    file_path = Path(row[0])

    # Mark as removing
    await db.execute(
        "UPDATE downloads SET state = ? WHERE id = ?", (STATE_REMOVING, download_id)
    )
    await db.commit()

    # Delete file
    if file_path.exists():
        file_path.unlink()

    # Delete row
    await db.execute("DELETE FROM downloads WHERE id = ?", (download_id,))
    await db.commit()

    return {"status": "removed", "id": download_id}


@router.get("/downloads/{download_id}/file")
async def serve_download(download_id: str):
    """Serve the cached local file directly for playback."""
    db = await get_db()

    cursor = await db.execute(
        "SELECT file_path, mime_type, state FROM downloads WHERE id = ?", (download_id,)
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Download not found")

    if row[2] != STATE_COMPLETED:
        raise HTTPException(status_code=409, detail="Download is not yet completed")

    file_path = Path(row[0])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Downloaded file not found on disk")

    return FileResponse(
        path=str(file_path),
        media_type=row[1] or "audio/mp4",
        filename=f"{download_id}{file_path.suffix}",
    )


# ─── WebSocket for download progress ─────────────────────────────

@router.websocket("/ws/downloads")
async def ws_downloads(websocket: WebSocket):
    """WebSocket for real-time download progress updates."""
    await websocket.accept()
    _ws_clients.append(websocket)

    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        if websocket in _ws_clients:
            _ws_clients.remove(websocket)


# ─── Internal download logic ─────────────────────────────────────

async def _download_file(video_id: str, stream_url: str, file_path: str):
    """Download a file from stream_url to file_path, updating progress."""
    db = await get_db()
    client = get_http_client()
    now_ms = int(time.time() * 1000)

    try:
        # Update state to downloading
        await db.execute(
            "UPDATE downloads SET state = ?, update_time_ms = ? WHERE id = ?",
            (STATE_DOWNLOADING, now_ms, video_id),
        )
        await db.commit()
        await _broadcast_progress(video_id, STATE_DOWNLOADING, 0.0, 0)

        # Stream download
        async with client.stream("GET", stream_url) as response:
            if response.status_code != 200:
                raise Exception(f"HTTP {response.status_code}")

            content_length = int(response.headers.get("content-length", 0))
            await db.execute(
                "UPDATE downloads SET content_length = ? WHERE id = ?",
                (content_length, video_id),
            )
            await db.commit()

            bytes_downloaded = 0
            path = Path(file_path)
            path.parent.mkdir(parents=True, exist_ok=True)

            with open(file_path, "wb") as f:
                async for chunk in response.aiter_bytes(chunk_size=65536):
                    f.write(chunk)
                    bytes_downloaded += len(chunk)

                    # Calculate progress
                    percent = (bytes_downloaded / content_length * 100.0) if content_length > 0 else 0.0
                    now_ms = int(time.time() * 1000)

                    # Update DB periodically (every ~256KB)
                    if bytes_downloaded % (256 * 1024) < 65536:
                        await db.execute(
                            "UPDATE downloads SET percent_downloaded = ?, bytes_downloaded = ?, update_time_ms = ? WHERE id = ?",
                            (percent, bytes_downloaded, now_ms, video_id),
                        )
                        await db.commit()
                        await _broadcast_progress(video_id, STATE_DOWNLOADING, percent, bytes_downloaded)

        # Mark as completed
        now_ms = int(time.time() * 1000)
        await db.execute(
            "UPDATE downloads SET state = ?, percent_downloaded = 100.0, bytes_downloaded = ?, update_time_ms = ? WHERE id = ?",
            (STATE_COMPLETED, bytes_downloaded, now_ms, video_id),
        )
        await db.commit()
        await _broadcast_progress(video_id, STATE_COMPLETED, 100.0, bytes_downloaded)

    except Exception as e:
        now_ms = int(time.time() * 1000)
        await db.execute(
            "UPDATE downloads SET state = ?, update_time_ms = ? WHERE id = ?",
            (STATE_FAILED, now_ms, video_id),
        )
        await db.commit()
        await _broadcast_progress(video_id, STATE_FAILED, 0.0, 0, error=str(e))


async def _broadcast_progress(
    video_id: str, state: int, percent: float, bytes_downloaded: int, error: Optional[str] = None
):
    """Broadcast download progress to WebSocket clients."""
    state_names = {0: "queued", 1: "downloading", 2: "completed", 3: "failed", 4: "removing"}
    message = {
        "type": "download_progress",
        "data": {
            "id": video_id,
            "state": state,
            "state_name": state_names.get(state, "unknown"),
            "percent_downloaded": percent,
            "bytes_downloaded": bytes_downloaded,
        },
    }
    if error:
        message["data"]["error"] = error

    disconnected = []
    for ws in _ws_clients:
        try:
            await ws.send_json(message)
        except Exception:
            disconnected.append(ws)
    for ws in disconnected:
        _ws_clients.remove(ws)
