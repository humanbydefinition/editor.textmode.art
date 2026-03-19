# ============================================================================
# Runner Dockerfile — Multi-stage build
# Produces a minimal Nginx container serving the static runner bundle
# ============================================================================

# --- Stage 1: Build ---
FROM node:22-alpine AS build

WORKDIR /build

# Copy workspace root files
COPY package.json package-lock.json ./

# Copy only the packages needed by the runner
COPY packages/ packages/

# Install dependencies (only runner workspace + shared packages)
RUN npm ci --workspace=@synth.textmode.art/runner --include-workspace-root

# Build shared contracts before building runner
RUN npm run build -w @synth.textmode.art/contracts

# Copy runner source
COPY packages/runner/ packages/runner/

# Accept build-time env vars (Vite inlines these at build time)
ARG VITE_RUNNER_PARENT_ORIGINS
ARG VITE_MEDIA_PROXY_URL

ENV VITE_RUNNER_PARENT_ORIGINS=${VITE_RUNNER_PARENT_ORIGINS}
ENV VITE_MEDIA_PROXY_URL=${VITE_MEDIA_PROXY_URL}

# Build the runner
RUN npm run build -w @synth.textmode.art/runner

# --- Stage 2: Serve ---
FROM nginx:alpine

# Copy built assets
COPY --from=build /build/packages/runner/dist /usr/share/nginx/html

# Security headers for the runner
COPY packages/runner/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
