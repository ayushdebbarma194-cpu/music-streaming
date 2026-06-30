"""
Module 8 — Realtime sync ("Together" mode) — optional/stretch
Simple WebSocket rooms for synchronized multi-device playback.
Any connected client broadcasts {action: play|pause|seek|track_change, payload}
to all other clients in the same room code.
No external Discord dependency — just a shared playback-state room.
"""

from typing import Dict, Optional, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

# Room management: room_code -> set of connected WebSocket clients
_rooms: Dict[str, Set[WebSocket]] = {}


@router.websocket("/ws/together/{room_code}")
async def ws_together(websocket: WebSocket, room_code: str):
    """
    WebSocket for synchronized playback rooms.
    Any message from a client is broadcast to all other clients in the same room.

    Expected message format:
    {
        "action": "play|pause|seek|track_change",
        "payload": { ... action-specific data ... }
    }
    """
    await websocket.accept()

    # Join room
    if room_code not in _rooms:
        _rooms[room_code] = set()
    _rooms[room_code].add(websocket)

    # Notify room of new participant
    await _broadcast_to_room(
        room_code,
        {
            "type": "participant_joined",
            "data": {"participants": len(_rooms[room_code])},
        },
        exclude=None,
    )

    try:
        while True:
            data = await websocket.receive_json()

            # Validate message has an action
            action = data.get("action")
            if action not in ("play", "pause", "seek", "track_change", "state_sync"):
                await websocket.send_json({
                    "type": "error",
                    "data": {"message": f"Unknown action: {action}"},
                })
                continue

            # Broadcast to all other clients in the room
            message = {
                "type": "room_action",
                "data": {
                    "action": action,
                    "payload": data.get("payload", {}),
                },
            }
            await _broadcast_to_room(room_code, message, exclude=websocket)

    except WebSocketDisconnect:
        pass
    finally:
        # Leave room
        if room_code in _rooms:
            _rooms[room_code].discard(websocket)

            # Clean up empty rooms
            if not _rooms[room_code]:
                del _rooms[room_code]
            else:
                # Notify remaining participants
                await _broadcast_to_room(
                    room_code,
                    {
                        "type": "participant_left",
                        "data": {"participants": len(_rooms.get(room_code, set()))},
                    },
                    exclude=None,
                )


async def _broadcast_to_room(room_code: str, message: dict, exclude: Optional[WebSocket]):
    """Broadcast a message to all clients in a room, optionally excluding one."""
    if room_code not in _rooms:
        return

    disconnected = set()
    for ws in _rooms[room_code]:
        if ws == exclude:
            continue
        try:
            await ws.send_json(message)
        except Exception:
            disconnected.add(ws)

    # Clean up disconnected clients
    for ws in disconnected:
        _rooms[room_code].discard(ws)
