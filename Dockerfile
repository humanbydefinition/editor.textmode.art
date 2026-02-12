# ============================================================================
# synth.textmode.art — Multi-target Dockerfile
# ============================================================================
#
# Build targets (used via docker-compose `target:`):
#   - client : Nginx serving the SPA + reverse proxy to server
#   - server : Node.js Fastify API + SSR slug pages + screenshot generation
#
# The runner has its own Dockerfile at runner/Dockerfile.
#
# ============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Install all workspace dependencies
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps

WORKDIR /build

# Copy workspace root + every workspace package.json for dependency resolution
COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/
COPY client/package.json client/
COPY server/package.json server/
COPY runner/package.json runner/

RUN npm ci

# ---------------------------------------------------------------------------
# Stage 2: Copy source code and build shared contracts
# ---------------------------------------------------------------------------
FROM deps AS source

COPY packages/ packages/
COPY client/ client/
COPY server/ server/

RUN npm run build -w @synth.textmode.art/contracts

# ---------------------------------------------------------------------------
# Stage 3: Build client SPA (Vite)
# ---------------------------------------------------------------------------
FROM source AS client-build

# Vite inlines VITE_* env vars at build time — pass via docker-compose build.args
ARG VITE_TURNSTILE_SITE_KEY
ARG VITE_PUBLISH_CONSENT_POLICY_VERSION
ARG VITE_RUNNER_URL
ARG VITE_RUNNER_PARENT_ORIGINS
ARG VITE_MEDIA_PROXY_URL
ARG VITE_API_BASE_URL

ENV VITE_TURNSTILE_SITE_KEY=${VITE_TURNSTILE_SITE_KEY}
ENV VITE_PUBLISH_CONSENT_POLICY_VERSION=${VITE_PUBLISH_CONSENT_POLICY_VERSION}
ENV VITE_RUNNER_URL=${VITE_RUNNER_URL}
ENV VITE_RUNNER_PARENT_ORIGINS=${VITE_RUNNER_PARENT_ORIGINS}
ENV VITE_MEDIA_PROXY_URL=${VITE_MEDIA_PROXY_URL}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build -w client

# ---------------------------------------------------------------------------
# Stage 4: Build server (TypeScript + Prisma generate)
# ---------------------------------------------------------------------------
FROM source AS server-build

# Reinstall dependencies in the server-build context to ensure workspace links are set up
RUN npm ci

# Prisma generate needs a DATABASE_URL to load config, but does NOT connect.
# Provide a dummy value so the config file parses successfully.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV ADMIN_API_TOKEN="build-placeholder"

RUN npm run build -w server


# ============================================================================
# Target: client — Nginx serving the SPA + reverse proxy to server
# ============================================================================
FROM nginx:alpine AS client

# Copy built SPA assets
COPY --from=client-build /build/client/dist /usr/share/nginx/html

# Production Nginx config (reverse proxy + SPA fallback)
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80


# ============================================================================
# Target: server — Node.js Fastify API server
# ============================================================================
FROM node:22-alpine AS server

WORKDIR /app

# System dependencies for Playwright-based OG screenshot generation
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# --- Copy workspace root package files ---
COPY package.json package-lock.json ./

# --- Install all dependencies (including workspace links) ---
RUN npm ci

# --- Copy built contracts ---
COPY --from=source /build/packages/ packages/

# --- Copy built server ---
COPY --from=server-build /build/server/package.json server/package.json
COPY --from=server-build /build/server/prisma.config.ts server/prisma.config.ts
COPY --from=server-build /build/server/dist/ server/dist/
COPY --from=server-build /build/server/prisma/ server/prisma/

# --- Copy built client SPA (needed by slug-page SSR template to inject OG meta) ---
COPY --from=client-build /build/client/dist/ dist/

# Regenerate Prisma client for the production Alpine platform
WORKDIR /app/server
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV ADMIN_API_TOKEN="build-placeholder"
RUN npx prisma generate

# Create persistent storage directory for screenshots
RUN mkdir -p /app/server/storage

# Clean up build-time env vars (runtime env is set by Docker)
ENV DATABASE_URL=""
ENV ADMIN_API_TOKEN=""

EXPOSE 3000

# Run pending migrations, then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
