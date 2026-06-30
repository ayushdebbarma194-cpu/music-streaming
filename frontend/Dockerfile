# ArchiveTune Frontend — Docker image
# Builds the React app and serves the static output with a tiny nginx runtime.
# For a native desktop binary, use Tauri (npm run tauri build) instead; this
# image serves the web UI standalone.

# ── Build stage ──────────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app

# Install deps first (separate layer) so source changes don't reinstall.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# Verify the build produced output
RUN ls -la /app/dist/index.html

# ── Runtime stage ────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Remove the default nginx site config that listens on port 80
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy our SPA config
COPY nginx.conf /etc/nginx/conf.d/archivetune.conf

# Copy built assets and ensure nginx user can read them
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

EXPOSE 1420

CMD ["nginx", "-g", "daemon off;"]
