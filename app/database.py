"""
ArchiveTune Backend — Database setup (SQLite via aiosqlite)
Manages the SQLite database for caching stream URLs, downloads metadata, and lyrics.
"""

from typing import Optional

import aiosqlite
from pathlib import Path

DB_PATH = Path("archivetune.db")

_db: Optional[aiosqlite.Connection] = None


async def get_db() -> aiosqlite.Connection:
    """Get or create the database connection."""
    global _db
    if _db is None:
        _db = await aiosqlite.connect(str(DB_PATH))
        _db.row_factory = aiosqlite.Row
        await _db.execute("PRAGMA journal_mode=WAL")
        await init_tables(_db)
    return _db


async def close_db():
    """Close the database connection."""
    global _db
    if _db is not None:
        await _db.close()
        _db = None


async def init_tables(db: aiosqlite.Connection):
    """Initialize all database tables."""
    # Stream URL cache (Module 1)
    await db.execute("""
        CREATE TABLE IF NOT EXISTS stream_cache (
            video_id TEXT PRIMARY KEY NOT NULL,
            stream_url TEXT NOT NULL,
            mime_type TEXT,
            bitrate INTEGER,
            itag INTEGER,
            expires_at INTEGER NOT NULL,
            cached_at INTEGER NOT NULL
        )
    """)

    # Downloads metadata (Module 3)
    await db.execute("""
        CREATE TABLE IF NOT EXISTS downloads (
            id TEXT PRIMARY KEY NOT NULL,
            mime_type TEXT,
            uri TEXT NOT NULL,
            custom_cache_key TEXT,
            file_path TEXT NOT NULL,
            state INTEGER NOT NULL,
            start_time_ms INTEGER NOT NULL,
            update_time_ms INTEGER NOT NULL,
            content_length INTEGER NOT NULL,
            percent_downloaded REAL NOT NULL,
            bytes_downloaded INTEGER NOT NULL
        )
    """)

    # Lyrics cache (Module 4)
    await db.execute("""
        CREATE TABLE IF NOT EXISTS lyrics_cache (
            cache_key TEXT PRIMARY KEY NOT NULL,
            source TEXT NOT NULL,
            synced INTEGER NOT NULL,
            content TEXT NOT NULL,
            cached_at INTEGER NOT NULL
        )
    """)

    await db.commit()
