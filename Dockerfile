# ArchiveTune Backend — Docker image
# Runs the FastAPI backend with uvicorn. Audio playback via mpv requires
# libmpv inside the container (or you can mount the host's PulseAudio socket).

FROM python:3.11-slim

# Install system dependencies: libmpv for audio playback
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libmpv2 \
        pulseaudio-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/
COPY assets/ ./assets/
COPY .env.example ./.env.example

# Create downloads directory
RUN mkdir -p /app/downloads

# Expose the backend port
EXPOSE 8000

# Run with uvicorn — bind to 0.0.0.0 inside container (Docker networking handles isolation)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
