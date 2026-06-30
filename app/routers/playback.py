"""
Module 2 — Audio playback engine
Uses mpv via python-mpv (libmpv bindings) for audio playback on Linux.
Implements a PlayerManager singleton, playback controls, queue management,
and WebSocket for real-time state updates.
"""

import asyncio
import time
from typing import Optional, List
from dataclasses import dataclass, field

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

router = APIRouter()


# ─── Models ──────────────────────────────────────────────────────

class PlayRequest(BaseModel):
    video_id: Optional[str] = None
    stream_url: Optional[str] = None


class SeekRequest(BaseModel):
    position_seconds: float


class VolumeRequest(BaseModel):
    level: int  # 0-100


class QueueAddRequest(BaseModel):
    video_id: Optional[str] = None
    stream_url: Optional[str] = None
    title: Optional[str] = None
    artist: Optional[str] = None


class QueueReorderRequest(BaseModel):
    from_index: int
    to_index: int


# ─── Queue Item ──────────────────────────────────────────────────

@dataclass
class QueueItem:
    video_id: Optional[str] = None
    stream_url: Optional[str] = None
    title: Optional[str] = None
    artist: Optional[str] = None


# ─── Player Manager Singleton ────────────────────────────────────

class PlayerManager:
    """Singleton wrapping an mpv.MPV instance for audio playback."""

    _instance: Optional["PlayerManager"] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True

        self._player = None
        self._current_track: Optional[dict] = None
        self._queue: List[QueueItem] = []
        self._queue_index: int = -1
        self._ws_clients: List[WebSocket] = []
        self._position_task: Optional[asyncio.Task] = None
        self._scrobble_notified: bool = False
        self._track_start_time: Optional[float] = None

    def _ensure_player(self):
        """Lazily initialize mpv player."""
        if self._player is None:
            try:
                import mpv
                self._player = mpv.MPV(
                    video=False,       # Audio only
                    ytdl=False,        # We handle URL resolution ourselves
                )
                # Register event observers
                @self._player.property_observer("pause")
                def on_pause_change(_name, value):
                    asyncio.get_event_loop().call_soon_threadsafe(
                        lambda: asyncio.ensure_future(self._broadcast_state())
                    )

                @self._player.event_callback("end-file")
                def on_end_file(event):
                    asyncio.get_event_loop().call_soon_threadsafe(
                        lambda: asyncio.ensure_future(self._on_track_end())
                    )
            except ImportError:
                raise HTTPException(
                    status_code=503,
                    detail="python-mpv is not installed or libmpv is not available on this system. "
                           "Install with: pip install python-mpv && sudo apt install libmpv2",
                )
            except Exception as e:
                raise HTTPException(
                    status_code=503,
                    detail=f"Failed to initialize mpv player: {str(e)}",
                )

    @property
    def is_playing(self) -> bool:
        if self._player is None:
            return False
        try:
            return not self._player.pause
        except Exception:
            return False

    @property
    def position(self) -> float:
        if self._player is None:
            return 0.0
        try:
            pos = self._player.time_pos
            return pos if pos is not None else 0.0
        except Exception:
            return 0.0

    @property
    def duration(self) -> float:
        if self._player is None:
            return 0.0
        try:
            dur = self._player.duration
            return dur if dur is not None else 0.0
        except Exception:
            return 0.0

    @property
    def volume(self) -> int:
        if self._player is None:
            return 100
        try:
            return int(self._player.volume)
        except Exception:
            return 100

    async def play(self, stream_url: str, video_id: Optional[str] = None,
                   title: Optional[str] = None, artist: Optional[str] = None):
        """Play a stream URL."""
        self._ensure_player()
        self._player.play(stream_url)
        self._current_track = {
            "video_id": video_id,
            "stream_url": stream_url,
            "title": title,
            "artist": artist,
        }
        self._scrobble_notified = False
        self._track_start_time = time.time()

        # Start position broadcasting
        if self._position_task is None or self._position_task.done():
            self._position_task = asyncio.create_task(self._position_broadcaster())

        # Fire now-playing scrobble
        await self._fire_now_playing()
        await self._broadcast_state()

    async def pause(self):
        """Pause playback."""
        self._ensure_player()
        self._player.pause = True
        await self._broadcast_state()

    async def resume(self):
        """Resume playback."""
        self._ensure_player()
        self._player.pause = False
        await self._broadcast_state()

    async def seek(self, position_seconds: float):
        """Seek to position."""
        self._ensure_player()
        self._player.seek(position_seconds, "absolute")
        await self._broadcast_state()

    async def set_volume(self, level: int):
        """Set volume (0-100)."""
        self._ensure_player()
        self._player.volume = max(0, min(100, level))
        await self._broadcast_state()

    def get_state(self) -> dict:
        """Get current playback state."""
        return {
            "is_playing": self.is_playing,
            "position": self.position,
            "duration": self.duration,
            "volume": self.volume,
            "current_track": self._current_track,
            "queue_length": len(self._queue),
            "queue_index": self._queue_index,
        }

    # ─── Queue Management ────────────────────────────────────────

    def add_to_queue(self, item: QueueItem):
        """Add an item to the queue."""
        self._queue.append(item)

    def remove_from_queue(self, index: int):
        """Remove item at index from queue."""
        if 0 <= index < len(self._queue):
            self._queue.pop(index)
            # Adjust current index if needed
            if index < self._queue_index:
                self._queue_index -= 1
        else:
            raise HTTPException(status_code=404, detail="Queue index out of range")

    def reorder_queue(self, from_index: int, to_index: int):
        """Move queue item from one position to another."""
        if not (0 <= from_index < len(self._queue)):
            raise HTTPException(status_code=400, detail="from_index out of range")
        if not (0 <= to_index < len(self._queue)):
            raise HTTPException(status_code=400, detail="to_index out of range")
        item = self._queue.pop(from_index)
        self._queue.insert(to_index, item)

    def get_queue(self) -> List[dict]:
        """Get the current queue."""
        return [
            {
                "index": i,
                "video_id": item.video_id,
                "stream_url": item.stream_url,
                "title": item.title,
                "artist": item.artist,
                "is_current": i == self._queue_index,
            }
            for i, item in enumerate(self._queue)
        ]

    # ─── WebSocket Management ────────────────────────────────────

    def add_ws_client(self, ws: WebSocket):
        self._ws_clients.append(ws)

    def remove_ws_client(self, ws: WebSocket):
        if ws in self._ws_clients:
            self._ws_clients.remove(ws)

    async def _broadcast_state(self):
        """Broadcast current state to all connected WebSocket clients."""
        state = self.get_state()
        disconnected = []
        for ws in self._ws_clients:
            try:
                await ws.send_json({"type": "state_update", "data": state})
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            self.remove_ws_client(ws)

    async def _position_broadcaster(self):
        """Periodically broadcast position updates (~1s)."""
        while True:
            await asyncio.sleep(1.0)
            if not self.is_playing:
                continue
            await self._broadcast_state()
            # Check scrobble threshold
            await self._check_scrobble_threshold()

    # ─── Scrobble Integration ────────────────────────────────────

    async def _fire_now_playing(self):
        """Fire now-playing notification to scrobble services."""
        if self._current_track:
            try:
                from app.routers.scrobble import notify_now_playing
                await notify_now_playing(
                    title=self._current_track.get("title", ""),
                    artist=self._current_track.get("artist", ""),
                    duration=self.duration,
                )
            except Exception:
                pass  # Don't let scrobble failures affect playback

    async def _check_scrobble_threshold(self):
        """
        Fire scrobble after the track has played past the threshold:
        50% or 4 minutes, whichever is shorter (per Last.fm rules).
        """
        if self._scrobble_notified or not self._current_track:
            return

        duration = self.duration
        position = self.position

        if duration <= 0:
            return

        threshold = min(duration * 0.5, 240.0)  # 50% or 4 minutes

        if position >= threshold:
            self._scrobble_notified = True
            try:
                from app.routers.scrobble import submit_scrobble
                await submit_scrobble(
                    title=self._current_track.get("title", ""),
                    artist=self._current_track.get("artist", ""),
                    duration=int(duration),
                    timestamp=int(self._track_start_time or time.time()),
                )
            except Exception:
                pass  # Don't let scrobble failures affect playback

    async def _on_track_end(self):
        """Handle track ending — play next in queue if available."""
        if self._queue_index < len(self._queue) - 1:
            self._queue_index += 1
            next_item = self._queue[self._queue_index]
            if next_item.stream_url:
                await self.play(
                    next_item.stream_url,
                    video_id=next_item.video_id,
                    title=next_item.title,
                    artist=next_item.artist,
                )
            elif next_item.video_id:
                # Resolve via Module 1
                from app.routers.innertube import _resolve_stream
                stream_info = await _resolve_stream(next_item.video_id)
                await self.play(
                    stream_info["stream_url"],
                    video_id=next_item.video_id,
                    title=next_item.title,
                    artist=next_item.artist,
                )
        else:
            await self._broadcast_state()


# Global player instance
player = PlayerManager()


# ─── Endpoints ───────────────────────────────────────────────────

@router.post("/playback/play")
async def play(request: PlayRequest):
    """Start playback. Provide video_id (resolves via InnerTube) or stream_url."""
    if not request.video_id and not request.stream_url:
        raise HTTPException(status_code=400, detail="Provide video_id or stream_url")

    stream_url = request.stream_url
    title = None
    artist = None

    if request.video_id:
        # Check offline downloads first
        from app.database import get_db
        db = await get_db()
        cursor = await db.execute(
            "SELECT file_path FROM downloads WHERE id = ? AND state = 2",
            (request.video_id,),
        )
        download = await cursor.fetchone()

        if download:
            stream_url = download[0]
        else:
            # Resolve via Module 1
            from app.routers.innertube import _resolve_stream, get_ytmusic
            stream_info = await _resolve_stream(request.video_id)
            stream_url = stream_info["stream_url"]

            # Get metadata
            try:
                yt = get_ytmusic()
                song_info = yt.get_song(request.video_id)
                video_details = song_info.get("videoDetails", {})
                title = video_details.get("title")
                artist = video_details.get("author")
            except Exception:
                pass

    await player.play(stream_url, video_id=request.video_id, title=title, artist=artist)
    return {"status": "playing", "stream_url": stream_url}


@router.post("/playback/pause")
async def pause():
    """Pause playback."""
    await player.pause()
    return {"status": "paused"}


@router.post("/playback/resume")
async def resume():
    """Resume playback."""
    await player.resume()
    return {"status": "resumed"}


@router.post("/playback/seek")
async def seek(request: SeekRequest):
    """Seek to position in seconds."""
    await player.seek(request.position_seconds)
    return {"status": "seeked", "position": request.position_seconds}


@router.post("/playback/volume")
async def set_volume(request: VolumeRequest):
    """Set volume level (0-100)."""
    if not 0 <= request.level <= 100:
        raise HTTPException(status_code=400, detail="Volume must be between 0 and 100")
    await player.set_volume(request.level)
    return {"status": "volume_set", "level": request.level}


@router.get("/playback/state")
async def get_state():
    """Get current playback state."""
    return player.get_state()


# ─── Queue Endpoints ─────────────────────────────────────────────

@router.post("/queue/add")
async def queue_add(request: QueueAddRequest):
    """Add a track to the queue."""
    item = QueueItem(
        video_id=request.video_id,
        stream_url=request.stream_url,
        title=request.title,
        artist=request.artist,
    )
    player.add_to_queue(item)
    return {"status": "added", "queue_length": len(player._queue)}


@router.delete("/queue/{index}")
async def queue_remove(index: int):
    """Remove a track from the queue by index."""
    player.remove_from_queue(index)
    return {"status": "removed", "queue_length": len(player._queue)}


@router.get("/queue")
async def queue_get():
    """Get the current queue."""
    return {"queue": player.get_queue()}


@router.post("/queue/reorder")
async def queue_reorder(request: QueueReorderRequest):
    """Reorder a queue item."""
    player.reorder_queue(request.from_index, request.to_index)
    return {"status": "reordered"}


# ─── WebSocket ───────────────────────────────────────────────────

@router.websocket("/ws/playback")
async def ws_playback(websocket: WebSocket):
    """
    WebSocket for real-time playback state updates.
    Pushes position updates every ~1s, track-change and buffering events.
    """
    await websocket.accept()
    player.add_ws_client(websocket)

    try:
        # Send initial state
        await websocket.send_json({"type": "state_update", "data": player.get_state()})

        # Keep connection alive, handle incoming commands
        while True:
            data = await websocket.receive_json()
            # Handle client commands via WebSocket
            action = data.get("action")
            if action == "play":
                request = PlayRequest(**data.get("payload", {}))
                await play(request)
            elif action == "pause":
                await player.pause()
            elif action == "resume":
                await player.resume()
            elif action == "seek":
                pos = data.get("payload", {}).get("position_seconds", 0)
                await player.seek(pos)
            elif action == "volume":
                level = data.get("payload", {}).get("level", 100)
                await player.set_volume(level)
    except WebSocketDisconnect:
        pass
    finally:
        player.remove_ws_client(websocket)
