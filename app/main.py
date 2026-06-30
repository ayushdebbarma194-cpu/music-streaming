"""
ArchiveTune Backend Service — Main Application
A standalone FastAPI service replicating the ArchiveTune Android app's backend logic.
Run with: uvicorn app.main:app --reload
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import get_db, close_db
from app.http_client import close_http_client
from app.routers import innertube, playback, downloads, lyrics, scrobble, ai, translate, together


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle management."""
    # Startup: initialize database
    await get_db()
    yield
    # Shutdown: clean up resources
    await close_db()
    await close_http_client()


app = FastAPI(
    title="ArchiveTune Backend",
    description="Personal music backend service — Linux equivalent of the ArchiveTune Android app",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow localhost origins and Tauri frontend only
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:*",
        "http://127.0.0.1:*",
        "tauri://localhost",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(innertube.router, prefix="/api", tags=["Music Source"])
app.include_router(playback.router, prefix="/api", tags=["Playback"])
app.include_router(downloads.router, prefix="/api", tags=["Downloads"])
app.include_router(lyrics.router, prefix="/api", tags=["Lyrics"])
app.include_router(scrobble.router, prefix="/api", tags=["Scrobbling"])
app.include_router(ai.router, prefix="/api", tags=["AI Features"])
app.include_router(translate.router, prefix="/api", tags=["Translation"])
app.include_router(together.router, tags=["Together Mode"])


@app.get("/health", tags=["System"])
async def health_check():
    """Basic health check endpoint."""
    return {"status": "ok", "service": "ArchiveTune Backend"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )
