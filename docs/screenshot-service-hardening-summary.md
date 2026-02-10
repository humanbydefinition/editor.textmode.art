# Screenshot Service Hardening Summary

## What Was Changed

- Replaced hardcoded `localhost` with configurable internal capture URL and safer default `127.0.0.1` in:
  - `server/src/modules/screenshot/screenshot.config.ts`
  - `server/src/modules/screenshot/screenshot.service.ts`
- Added screenshot env config:
  - `SCREENSHOT_BASE_URL`
  - `SCREENSHOT_STORAGE_DIR`
  - `SCREENSHOT_PREVIEW_TOKEN`
  - Implemented in `server/src/config/env.ts`
  - Documented in `.env.example`
- Added token auth for screenshot preview route and automatic header forwarding from capture service.
- Restricted preview rendering to approved sketches only, validated slugs, fixed script escaping, and applied strict noindex/no-cache headers.
- Shared screenshot storage path config between service and static serving; auto-create storage directory on boot.
- Ensured OG image meta URLs are absolute when needed for crawler reliability.
- Replaced ad-hoc console logging in admin screenshot flow with structured Fastify logger usage.
- Cleaned backfill and local test scripts:
  - concise/professional logs
  - guaranteed Prisma disconnect
- Added helper script for Playwright browser install:
  - `npm run -w server playwright:install`

## Internal-Only Preview Route

- Preview route moved to: `/_internal/preview/:slug`
- Token-gated and constant-time token comparison.
- In production, `SCREENSHOT_PREVIEW_TOKEN` is required at startup.
- Screenshot capture fails fast if token is missing.

## Validation

- `npm run -w server lint` passed
- `npm run -w server check-types` passed
- `npm run -w server build` passed

## Coolify Deployment Requirements

Set the following environment variables:

- `SCREENSHOT_PREVIEW_TOKEN` (required in production)
- `PUBLIC_BASE_URL` (required for absolute OG URLs)
- `SCREENSHOT_STORAGE_DIR` (set to a mounted persistent volume path)
- `SCREENSHOT_BASE_URL` (optional; default is `http://127.0.0.1:${PORT}`)

Operational requirements:

- Mount persistent storage for screenshot files.
- Ensure Chromium is installed in deploy/runtime image:
  - `npm run -w server playwright:install`
