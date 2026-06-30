# ArchiveTune Frontend — Docker image
# Builds the React app and serves it with a lightweight static file server.
# In production you'd use Tauri for a native binary; this is for development
# or serving the web UI standalone without Tauri.

FROM node:22-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Serve with a lightweight static server
FROM node:22-slim AS runner

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 1420

CMD ["serve", "-s", "dist", "-l", "1420"]
