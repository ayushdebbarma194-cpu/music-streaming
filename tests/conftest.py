"""
Shared test configuration and fixtures.
"""

import asyncio
import os
import sys
from pathlib import Path

import pytest

# Ensure the app module is importable
sys.path.insert(0, str(Path(__file__).parent.parent))

# Use a test database
os.environ["DATABASE_URL"] = ":memory:"


@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()
