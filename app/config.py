"""
ArchiveTune Backend — Configuration
Reads all API keys/tokens from environment variables via pydantic-settings.
Every integration safely no-ops (returns a clear "not configured" error) if its key is missing.
"""

from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ─── YouTube Music (InnerTube) ───────────────────────────────
    ytmusic_auth_file: Optional[str] = None

    # ─── Last.fm Scrobbling ──────────────────────────────────────
    lastfm_api_key: Optional[str] = None
    lastfm_api_secret: Optional[str] = None
    lastfm_username: Optional[str] = None
    lastfm_password: Optional[str] = None

    # ─── ListenBrainz Scrobbling ────────────────────────────────
    listenbrainz_token: Optional[str] = None

    # ─── AI Providers ────────────────────────────────────────────
    anthropic_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    openrouter_api_key: Optional[str] = None

    # ─── Google Cloud Translation ────────────────────────────────
    gcp_translation_api_key: Optional[str] = None

    # ─── Downloads ───────────────────────────────────────────────
    download_dir: str = "./downloads"

    # ─── Server ──────────────────────────────────────────────────
    host: str = "127.0.0.1"
    port: int = 8000

    # ─── Helper methods ──────────────────────────────────────────
    @property
    def lastfm_configured(self) -> bool:
        return bool(self.lastfm_api_key and self.lastfm_api_secret)

    @property
    def listenbrainz_configured(self) -> bool:
        return bool(self.listenbrainz_token)

    @property
    def anthropic_configured(self) -> bool:
        return bool(self.anthropic_api_key)

    @property
    def openai_configured(self) -> bool:
        return bool(self.openai_api_key)

    @property
    def gemini_configured(self) -> bool:
        return bool(self.gemini_api_key)

    @property
    def openrouter_configured(self) -> bool:
        return bool(self.openrouter_api_key)

    @property
    def download_path(self) -> Path:
        path = Path(self.download_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path


settings = Settings()
