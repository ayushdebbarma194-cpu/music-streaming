"""
Integration tests for Module 1 — InnerTube/Music Source
Uses respx to mock httpx calls and patches ytmusicapi to avoid hitting live API.
"""

import time
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create a test client with mocked dependencies."""
    from app.main import app
    return TestClient(app)


@pytest.fixture
def mock_ytmusic():
    """Mock the YTMusic instance."""
    with patch("app.routers.innertube._ytmusic") as mock:
        yt = MagicMock()
        mock_instance = yt

        # Mock search results
        mock_instance.search.return_value = [
            {
                "category": "Songs",
                "resultType": "song",
                "title": "Bohemian Rhapsody",
                "artists": [{"name": "Queen", "id": "UCiMhD4jzUqG-IgPzUmmytRQ"}],
                "album": {"name": "A Night at the Opera", "id": "MPREb_xxx"},
                "videoId": "fJ9rUzIMcZQ",
                "duration": "5:55",
                "duration_seconds": 355,
                "thumbnails": [{"url": "https://lh3.googleusercontent.com/xxx", "width": 60, "height": 60}],
            }
        ]

        # Mock get_song results
        import time as _time
        _future_expire = int(_time.time()) + 7200
        mock_instance.get_song.return_value = {
            "videoDetails": {
                "videoId": "fJ9rUzIMcZQ",
                "title": "Bohemian Rhapsody",
                "author": "Queen",
                "lengthSeconds": "355",
                "thumbnail": {
                    "thumbnails": [
                        {"url": "https://i.ytimg.com/vi/fJ9rUzIMcZQ/maxresdefault.jpg", "width": 1280, "height": 720}
                    ]
                },
                "isLiveContent": False,
            },
            "streamingData": {
                "adaptiveFormats": [
                    {
                        "itag": 140,
                        "url": f"https://rr3---sn-xxx.googlevideo.com/videoplayback?expire={_future_expire}&id=fJ9rUzIMcZQ",
                        "mimeType": 'audio/mp4; codecs="mp4a.40.2"',
                        "bitrate": 130000,
                        "contentLength": "5800000",
                    },
                    {
                        "itag": 251,
                        "url": f"https://rr3---sn-xxx.googlevideo.com/videoplayback?expire={_future_expire}&id=fJ9rUzIMcZQ&itag=251",
                        "mimeType": 'audio/webm; codecs="opus"',
                        "bitrate": 160000,
                        "contentLength": "6100000",
                    },
                    {
                        "itag": 137,
                        "url": f"https://rr3---sn-xxx.googlevideo.com/videoplayback?expire={_future_expire}&video",
                        "mimeType": 'video/mp4; codecs="avc1.640028"',
                        "bitrate": 4000000,
                        "contentLength": "50000000",
                    },
                ],
            },
        }

        # Mock playlist
        mock_instance.get_playlist.return_value = {
            "id": "PLMC9KNkIncKtPzC7JOPyG-EEfCBV6A",
            "title": "Test Playlist",
            "tracks": [
                {"videoId": "fJ9rUzIMcZQ", "title": "Bohemian Rhapsody", "artists": [{"name": "Queen"}]},
            ],
        }

        # Mock artist
        mock_instance.get_artist.return_value = {
            "name": "Queen",
            "channelId": "UCiMhD4jzUqG-IgPzUmmytRQ",
            "songs": {"results": []},
            "albums": {"results": []},
        }

        # Mock album
        mock_instance.get_album.return_value = {
            "title": "A Night at the Opera",
            "artists": [{"name": "Queen"}],
            "tracks": [
                {"videoId": "fJ9rUzIMcZQ", "title": "Bohemian Rhapsody"},
            ],
        }

        with patch("app.routers.innertube.get_ytmusic", return_value=mock_instance):
            yield mock_instance


class TestSearch:
    """Tests for the search endpoint."""

    def test_search_songs(self, client, mock_ytmusic):
        """Test searching for songs."""
        response = client.get("/api/search?q=Bohemian+Rhapsody&type=songs")
        assert response.status_code == 200
        data = response.json()
        assert data["query"] == "Bohemian Rhapsody"
        assert data["type"] == "songs"
        assert len(data["results"]) > 0
        mock_ytmusic.search.assert_called_once_with("Bohemian Rhapsody", filter="songs", limit=20)

    def test_search_no_type(self, client, mock_ytmusic):
        """Test searching without type filter."""
        response = client.get("/api/search?q=Queen")
        assert response.status_code == 200
        data = response.json()
        assert data["type"] is None
        mock_ytmusic.search.assert_called_once_with("Queen", filter=None, limit=20)

    def test_search_albums(self, client, mock_ytmusic):
        """Test searching for albums."""
        response = client.get("/api/search?q=Night+at+the+Opera&type=albums")
        assert response.status_code == 200
        mock_ytmusic.search.assert_called_once_with("Night at the Opera", filter="albums", limit=20)

    def test_search_requires_query(self, client, mock_ytmusic):
        """Test that search requires a query parameter."""
        response = client.get("/api/search")
        assert response.status_code == 422  # Validation error


class TestSongResolution:
    """Tests for song metadata + stream URL resolution."""

    def test_get_song(self, client, mock_ytmusic):
        """Test getting song metadata and stream URL."""
        response = client.get("/api/song/fJ9rUzIMcZQ")
        assert response.status_code == 200
        data = response.json()

        assert data["video_id"] == "fJ9rUzIMcZQ"
        assert data["title"] == "Bohemian Rhapsody"
        assert data["artist"] == "Queen"
        assert data["duration_seconds"] == 355
        assert "stream_url" in data
        assert data["mime_type"].startswith("audio/")
        # Should pick highest bitrate audio format (opus at 160000)
        assert data["bitrate"] == 160000

    def test_get_song_caching(self, client, mock_ytmusic):
        """Test that resolved stream URLs are cached."""
        # Use a unique video ID for this test to avoid cache from previous test
        unique_id = "cache_test_123"
        import time as _time
        _future = int(_time.time()) + 7200
        mock_ytmusic.get_song.return_value["videoDetails"]["videoId"] = unique_id
        mock_ytmusic.get_song.return_value["streamingData"]["adaptiveFormats"][1]["url"] = (
            f"https://rr3---sn-xxx.googlevideo.com/videoplayback?expire={_future}&id={unique_id}&itag=251"
        )

        # First call — should resolve and cache
        response1 = client.get(f"/api/song/{unique_id}")
        assert response1.status_code == 200
        data1 = response1.json()
        assert data1["cached"] is False

        # Second call — should hit cache
        response2 = client.get(f"/api/song/{unique_id}")
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["cached"] is True

    def test_get_song_filters_video_formats(self, client, mock_ytmusic):
        """Test that video formats are filtered out, only audio returned."""
        response = client.get("/api/song/fJ9rUzIMcZQ")
        assert response.status_code == 200
        data = response.json()
        # Should not return video/mp4 format
        assert "video" not in data["mime_type"]


class TestPlaylist:
    """Tests for playlist endpoint."""

    def test_get_playlist(self, client, mock_ytmusic):
        """Test getting a playlist."""
        response = client.get("/api/playlist/PLMC9KNkIncKtPzC7JOPyG-EEfCBV6A")
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Test Playlist"
        assert len(data["tracks"]) > 0


class TestArtist:
    """Tests for artist endpoint."""

    def test_get_artist(self, client, mock_ytmusic):
        """Test getting an artist."""
        response = client.get("/api/artist/UCiMhD4jzUqG-IgPzUmmytRQ")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Queen"


class TestAlbum:
    """Tests for album endpoint."""

    def test_get_album(self, client, mock_ytmusic):
        """Test getting an album."""
        response = client.get("/api/album/MPREb_xxx")
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "A Night at the Opera"
