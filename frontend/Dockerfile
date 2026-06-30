# ArchiveTune Frontend — Docker image
# Builds the React app and serves the static output with a tiny nginx runtime.
# For a native desktop binary, use Tauri (npm run tauri build) instead; this
# image serves the web UI standalone.

# ── Build stage ──────────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app

# Install deps first (separate layer) so source changes don't reinstall.
# BuildKit cache mount keeps the npm cache warm across builds.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ── Runtime stage ────────────────────────────────────────────────
# nginx:alpine is ~15-50MB vs a full node image (~200MB+).
FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 1420

CMD ["nginx", "-g", "daemon off;"]
