# ArchiveTune Backend — Docker image
# Audio playback via mpv requires libmpv inside the container (or mount the
# host's PulseAudio socket — see docker-compose.yml).
#
# Build (full, with AI SDKs):   docker build -t archivetune .
# Build (lean, no AI SDKs):     docker build --build-arg INCLUDE_AI=false -t archivetune .

FROM python:3.11-slim

# Bring in uv — a much faster drop-in replacement for pip.
COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /uvx /bin/

# Install only the runtime system dependency: libmpv for audio playback.
RUN apt-get update && \
    apt-get install -y --no-install-recommends libmpv2 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# uv settings: install into the system environment, use a cached wheel dir.
ENV UV_SYSTEM_PYTHON=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Whether to include the optional AI provider SDKs (heavy: anthropic, openai,
# google-generativeai). Set to "false" for a leaner, faster image.
ARG INCLUDE_AI=true

# Install dependencies first (separate layer) so code changes don't bust the
# dependency cache. BuildKit cache mount keeps the uv cache across builds.
COPY requirements.txt requirements-ai.txt ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv pip install --system -r requirements.txt && \
    if [ "$INCLUDE_AI" = "true" ]; then \
        uv pip install --system -r requirements-ai.txt; \
    fi

# Copy application code (changes here reuse the dependency layer above).
COPY app/ ./app/
COPY assets/ ./assets/

RUN mkdir -p /app/downloads

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
