"""
Integration tests for Module 4 — Lyrics Waterfall
Uses respx to mock HTTP calls so tests don't hit live APIs.
"""

import base64
import json
from unittest.mock import patch, MagicMock

import pytest
import respx
from httpx import Response
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create a test client."""
    from app.main import app
    return TestClient(app)


@pytest.fixture(autouse=True)
def reset_http_client():
    """Reset the shared HTTP client between tests."""
    from app import http_client
    http_client._client = None
    yield
    http_client._client = None


class TestLRCParser:
    """Tests for the LRC lyrics parser."""

    def test_parse_standard_lrc(self):
        """Test parsing standard LRC format."""
        from app.routers.lyrics import _parse_lrc

        lrc = "[00:12.34]First line\n[00:15.67]Second line\n[01:00.00]Third line"
        lines = _parse_lrc(lrc)

        assert len(lines) == 3
        assert lines[0] == {"time_ms": 12340, "text": "First line"}
        assert lines[1] == {"time_ms": 15670, "text": "Second line"}
        assert lines[2] == {"time_ms": 60000, "text": "Third line"}

    def test_parse_lrc_three_digit_ms(self):
        """Test parsing LRC with three-digit milliseconds."""
        from app.routers.lyrics import _parse_lrc

        lrc = "[00:12.345]Line with ms"
        lines = _parse_lrc(lrc)

        assert len(lines) == 1
        assert lines[0] == {"time_ms": 12345, "text": "Line with ms"}

    def test_parse_lrc_empty_lines_skipped(self):
        """Test that empty text lines are skipped."""
        from app.routers.lyrics import _parse_lrc

        lrc = "[00:12.34]Real line\n[00:15.67]\n[00:20.00]Another line"
        lines = _parse_lrc(lrc)

        assert len(lines) == 2
        assert lines[0]["text"] == "Real line"
        assert lines[1]["text"] == "Another line"

    def test_parse_lrc_invalid_format(self):
        """Test that non-LRC lines are ignored."""
        from app.routers.lyrics import _parse_lrc

        lrc = "This is not LRC\n[00:12.34]But this is\nAnother plain line"
        lines = _parse_lrc(lrc)

        assert len(lines) == 1
        assert lines[0]["text"] == "But this is"


class TestCacheKey:
    """Tests for cache key generation."""

    def test_cache_key_consistency(self):
        """Test that same inputs produce same cache key."""
        from app.routers.lyrics import _make_cache_key

        key1 = _make_cache_key("Song Title", "Artist Name", "abc123")
        key2 = _make_cache_key("Song Title", "Artist Name", "abc123")
        assert key1 == key2

    def test_cache_key_case_insensitive(self):
        """Test that cache keys are case-insensitive."""
        from app.routers.lyrics import _make_cache_key

        key1 = _make_cache_key("Song Title", "Artist", "")
        key2 = _make_cache_key("song title", "artist", "")
        assert key1 == key2

    def test_cache_key_different_inputs(self):
        """Test that different inputs produce different cache keys."""
        from app.routers.lyrics import _make_cache_key

        key1 = _make_cache_key("Song A", "Artist A", "")
        key2 = _make_cache_key("Song B", "Artist B", "")
        assert key1 != key2


class TestKugouSource:
    """Tests for Kugou lyrics source."""

    @respx.mock
    @pytest.mark.asyncio
    async def test_kugou_success(self):
        """Test successful Kugou lyrics fetch."""
        from app.routers.lyrics import _try_kugou

        # Mock search endpoint
        respx.get("https://mobileservice.kugou.com/api/v3/search/song").mock(
            return_value=Response(200, json={
                "data": {
                    "info": [
                        {"hash": "abc123", "duration": 240}
                    ]
                }
            })
        )

        # Mock lyrics search
        respx.get("https://lyrics.kugou.com/search").mock(
            return_value=Response(200, json={
                "candidates": [
                    {"id": "lyrics1", "accesstoken": "token123"}
                ]
            })
        )

        # Mock lyrics download — LRC content is base64 encoded
        lrc_content = "[00:12.34]Hello world\n[00:15.67]Second line"
        encoded = base64.b64encode(lrc_content.encode()).decode()
        respx.get("https://lyrics.kugou.com/download").mock(
            return_value=Response(200, json={
                "content": encoded
            })
        )

        result = await _try_kugou("Hello", "World")

        assert result is not None
        assert result["source"] == "kugou"
        assert result["synced"] is True
        assert len(result["lines"]) == 2
        assert result["lines"][0]["text"] == "Hello world"

    @respx.mock
    @pytest.mark.asyncio
    async def test_kugou_no_results(self):
        """Test Kugou returns None when no songs found."""
        from app.routers.lyrics import _try_kugou

        respx.get("https://mobileservice.kugou.com/api/v3/search/song").mock(
            return_value=Response(200, json={
                "data": {"info": []}
            })
        )

        result = await _try_kugou("Nonexistent Song", "Unknown Artist")
        assert result is None


class TestSimpmusicSource:
    """Tests for SimpMusic lyrics source."""

    @respx.mock
    @pytest.mark.asyncio
    async def test_simpmusic_synced(self):
        """Test SimpMusic with synced lyrics."""
        from app.routers.lyrics import _try_simpmusic

        respx.get("https://api-lyrics.simpmusic.org/v1/").mock(
            return_value=Response(200, json={
                "syncedLyrics": "[00:10.00]Line one\n[00:20.00]Line two",
                "lyrics": "Line one\nLine two",
            })
        )

        result = await _try_simpmusic("Test Song", "Test Artist")

        assert result is not None
        assert result["source"] == "simpmusic"
        assert result["synced"] is True
        assert len(result["lines"]) == 2

    @respx.mock
    @pytest.mark.asyncio
    async def test_simpmusic_plain_text(self):
        """Test SimpMusic with plain text lyrics."""
        from app.routers.lyrics import _try_simpmusic

        respx.get("https://api-lyrics.simpmusic.org/v1/").mock(
            return_value=Response(200, json={
                "syncedLyrics": "",
                "lyrics": "Just plain text lyrics\nWith multiple lines",
            })
        )

        result = await _try_simpmusic("Test Song", "Test Artist")

        assert result is not None
        assert result["source"] == "simpmusic"
        assert result["synced"] is False
        assert result["plain_text"] is not None

    @respx.mock
    @pytest.mark.asyncio
    async def test_simpmusic_not_found(self):
        """Test SimpMusic returns None on 404."""
        from app.routers.lyrics import _try_simpmusic

        respx.get("https://api-lyrics.simpmusic.org/v1/").mock(
            return_value=Response(404)
        )

        result = await _try_simpmusic("Test Song", "Test Artist")
        assert result is None


class TestYouTubeCaptionsSource:
    """Tests for YouTube captions/lyrics source."""

    @pytest.mark.asyncio
    async def test_youtube_captions_success(self):
        """Test YouTube captions/lyrics fetch."""
        from app.routers.lyrics import _try_youtube_captions

        mock_yt = MagicMock()
        mock_yt.get_watch_playlist.return_value = {"lyrics": "browse_id_123"}
        mock_yt.get_lyrics.return_value = {
            "lyrics": "Lyrics line 1\nLyrics line 2\nLyrics line 3",
            "source": "YouTube Music",
        }

        with patch("app.routers.innertube.get_ytmusic", return_value=mock_yt):
            result = await _try_youtube_captions("test_video_id")

        assert result is not None
        assert result["source"] == "youtube"
        assert result["synced"] is False
        assert len(result["lines"]) == 3
        assert result["plain_text"] == "Lyrics line 1\nLyrics line 2\nLyrics line 3"

    @pytest.mark.asyncio
    async def test_youtube_captions_no_lyrics(self):
        """Test YouTube captions returns None when no lyrics available."""
        from app.routers.lyrics import _try_youtube_captions

        mock_yt = MagicMock()
        mock_yt.get_watch_playlist.return_value = {"lyrics": None}

        with patch("app.routers.innertube.get_ytmusic", return_value=mock_yt):
            result = await _try_youtube_captions("test_video_id")

        assert result is None


class TestLyricsEndpoint:
    """Tests for the /api/lyrics endpoint (full waterfall)."""

    @respx.mock
    def test_lyrics_endpoint_no_results(self, client):
        """Test lyrics endpoint when no source returns results."""
        # Mock all external calls to return empty
        respx.get("https://mobileservice.kugou.com/api/v3/search/song").mock(
            return_value=Response(200, json={"data": {"info": []}})
        )
        respx.get("https://api-lyrics.simpmusic.org/v1/").mock(
            return_value=Response(404)
        )

        with patch("app.routers.lyrics._try_youtube_captions", return_value=None):
            response = client.get("/api/lyrics?title=Unknown&artist=Nobody&video_id=xxx")

        assert response.status_code == 200
        data = response.json()
        assert data["source"] is None
        assert data["lines"] == []

    @respx.mock
    def test_lyrics_endpoint_simpmusic_success(self, client):
        """Test lyrics endpoint succeeding via SimpMusic after Kugou fails."""
        # Kugou fails
        respx.get("https://mobileservice.kugou.com/api/v3/search/song").mock(
            return_value=Response(200, json={"data": {"info": []}})
        )
        # SimpMusic succeeds
        respx.get("https://api-lyrics.simpmusic.org/v1/").mock(
            return_value=Response(200, json={
                "syncedLyrics": "[00:10.00]Hello there\n[00:20.00]General Kenobi",
                "lyrics": "Hello there\nGeneral Kenobi",
            })
        )

        response = client.get("/api/lyrics?title=Hello+There&artist=Test")
        assert response.status_code == 200
        data = response.json()
        assert data["source"] == "simpmusic"
        assert data["synced"] is True
        assert len(data["lines"]) == 2
