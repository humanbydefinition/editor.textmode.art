# AGENTS.md

**synth.textmode.art**: Live coding environment for procedural text generation, ASCII synthesis, and algorithmic patterns. Combines [`textmode.js`](https://github.com/humanbydefinition/textmode.js) visuals with [`Strudel`](https://strudel.cc/) audio in a hybrid creative coding editor with real-time execution, share links, and admin moderation.

## Workflow Rules

- **CRITICAL**: Never start the dev server manually. The user will start it if needed.
- **CRITICAL**: Never git commit or push unless explicitly asked. Wait for user review.
- **CRITICAL**: Never edit files in `dist/`, `node_modules/`, or generated files like `generatedTypes.ts`.
- Prefer small, targeted changes over large refactors.
- If you cannot run tests or lint, say so explicitly.
- If asked to commit, write clear, short, and concise commit messages.

## Core Stack

| Layer | Technology |
|-------|-----------|
| **Client framework** | React 19 + TypeScript 5.9 |
| **Build tool** | Vite 7 |
| **Editor** | Monaco Editor |
| **State management** | Zustand 5 (sliced store with devtools) |
| **UI components** | Radix UI + shadcn/ui |
| **Styling** | Tailwind CSS 4 |
| **Visual engine** | textmode.js + textmode.synth.js + textmode.filters.js |
| **Audio engine** | @strudel/web |
| **Server framework** | Fastify 5 |
| **Database** | PostgreSQL + Prisma ORM |
| **Validation** | Zod (shared contracts) |
| **Package manager** | npm (workspaces) |
| **License** | AGPL-3.0-or-later |

## Development Commands

Run from the **repo root**:

```bash
npm install                    # Install all workspace dependencies
npm run dev                    # Start client dev server (Vite)
npm run server:dev             # Start server dev (Fastify + Prisma migrate)
npm run build                  # Production build (contracts → client → server)
npm run lint                   # Lint client + server
npm run check-types            # Typecheck contracts → client → server
npm run format                 # Prettier auto-format
npm run format:check           # Prettier check
npm run extract-types          # Regenerate Monaco type definitions
```

### Server-specific:

```bash
npm run -w @synth.textmode.art/server prisma:migrate       # Create new migration
npm run -w @synth.textmode.art/server prisma:migrate:deploy # Deploy migrations
npm run -w @synth.textmode.art/server prisma:studio        # Open Prisma Studio
npm run -w @synth.textmode.art/server playwright:install   # Install Chromium for screenshots
npm run -w @synth.textmode.art/server screenshots:regenerate # Regenerate all approved screenshots
```

## Monorepo Structure

```
synth.textmode.art/
└── packages/
    ├── client/                      # Vite + React SPA
    │   └── src/
    │       ├── app/                 # Bootstrap, runtime, orchestration
    │       │   ├── bootstrap/       # startClientApp.ts (entry routing)
    │       │   └── runtime/         # AppRuntime (composition root)
    │       ├── engines/             # Engine implementations
    │       │   ├── textmode/        # Visual engine (Editor + Runtime + Controller)
    │       │   └── strudel/         # Audio engine (Editor + Runtime + Controller)
    │       ├── sandbox/             # Iframe protocol & runner communication
    │       ├── platform/state/      # Zustand store + slices + adapters
    │       ├── features/            # Feature modules (admin, editor, share, publish)
    │       ├── services/            # API services (SketchApi, Share, Audio, Storage)
    │       ├── components/          # Shared React components (AppShell, dialogs)
    │       ├── shared/ui/           # shadcn/ui primitives
    │       ├── managers/            # Editor & shortcuts managers
    │       ├── core/                # Base classes (BaseController, BaseEditor)
    │       ├── types/               # TypeScript type definitions
    │       └── styles/              # CSS entry point
    ├── server/                      # Fastify API server
    │   ├── src/
    │   │   ├── app.ts               # Slim application orchestrator
    │   │   ├── config/env.ts        # Zod-validated environment config
    │   │   ├── modules/             # Feature modules (routes, services, mappers)
    │   │   │   └── [feature]/       # e.g. admin, sketches
    │   │   │       ├── *.routes.ts  # HTTP layer (validation, response)
    │   │   │       ├── *.service.ts # Business logic & data access
    │   │   │       └── *.mapper.ts  # Data mapping (DTOs)
    │   │   ├── plugins/             # Fastify plugins (cors, helmet, error-handler)
    │   │   ├── middleware/          # Request middleware
    │   │   ├── security/            # Auth & anti-spam guards
    │   │   ├── database/            # Prisma client & lifecycle
    │   │   └── shared/              # Shared utilities (mappers, slug, errors)
    │   ├── scripts/                 # Utility scripts (test-screenshot, regenerate)
    │   └── prisma/
    │       └── schema.prisma        # Database schema
    ├── runner/                      # Isolated iframe runner bundle
    └── contracts/                   # Shared types & validation (client ↔ server)
        └── src/
            ├── sketch.ts            # Sketch request types + anti-spam serialization
            ├── admin.ts             # Admin API types
            └── share.ts             # Share link types
```

## Key Architectures

### Engine Pattern

Each engine (textmode, strudel) follows a consistent **Editor + Runtime + Controller** triad:

- **Editor**: Monaco Editor wrapper with engine-specific keybindings and syntax
- **Runtime**: Execution environment (iframe runner for textmode, Web Audio for strudel)
- **Controller**: Mediates between editor and runtime, handles auto-execute, debouncing, and state sync

Engines are initialized by `AppRuntime` (the composition root at `packages/client/src/app/runtime/AppRuntime.ts`), which orchestrates lifecycle, settings, share workflows, and rendering.

### Sandbox Protocol

Textmode visuals execute in an **iframe runner** for isolation. Communication uses a typed message protocol defined in `packages/client/src/sandbox/protocol.ts`:

- **Parent → Runner**: `RUN_CODE`, `SOFT_RESET`, `AUDIO_DATA`
- **Runner → Parent**: `READY`, `RUN_OK`, `RUN_ERROR`, `SYNTH_ERROR`, `TOGGLE_UI`, `USER_INTERACTION`
- **Window → Runner**: `INIT` (versioned handshake)

The runner can optionally be hosted on a separate origin (`VITE_RUNNER_URL`) for additional security isolation.

### State Management

Zustand store at `packages/client/src/platform/state/appStore.ts` is composed from four domain slices:

| Slice | Concern |
|-------|---------|
| `settingsSlice` | App settings (font size, auto-execute, editor preferences) |
| `engineSlice` | Engine states and custom per-engine data |
| `shareSlice` | Share link loading, URL parsing, lock state |
| `uiSlice` | Panel visibility, window dimensions, responsive layout |

Store uses `devtools` (dev only) and `subscribeWithSelector` middleware.

### Server Architecture

The server uses a **Layered Architecture** to separate concerns:

1.  **Plugins (`plugins/`)**: Cross-cutting concerns (CORS, Helmet, Error Handling, Database Lifecycle) registered in `app.ts`.
2.  **Routes (`*.routes.ts`)**: HTTP layer. Handles request validation, auth middleware, and response formatting. **No business logic or DB calls.**
3.  **Services (`*.service.ts`)**: Domain logic and data access (Prisma). Reusable and independent of HTTP transport.
4.  **Mappers (`*.mapper.ts` / `shared/mappers.ts`)**: Transforms internal DB entities into public API contracts (DTOs).

### Server Module System

Server routes are organized by feature under `packages/server/src/modules/`:

| Module | Purpose | Routes |
|--------|---------|--------|
| `sketches` | Public sketch access (approved only) | `GET /api/sketches/:slug`, `GET /api/sketches/random` |
| `submissions` | Sketch publish requests with anti-spam | `POST /api/sketch-requests`, `GET /api/sketch-requests/challenge` |
| `admin` | Moderation dashboard API (Bearer token) | `/api/admin/*` |
| `slug-page` | Server-rendered SEO pages | `GET /s/:slug` |
| `screenshot` | Playwright-based OG image generation | Internal preview routes |
| `media` | CORS proxy for external media | `GET /api/media?url=...` |

### Anti-Spam System

Sketch submissions use a **proof-of-work challenge** system:
1. Client requests challenge from `GET /api/sketch-requests/challenge`
2. Client solves SHA-256 leading-zero-bits puzzle (`sha256-leading-zero-bits-v1`)
3. Client submits with nonce, challenge ID, payload hash, and Cloudflare Turnstile token
4. Server validates challenge, PoW, Turnstile, and idempotency

### Shared Contracts

The `@synth.textmode.art/contracts` package provides **shared Zod schemas and TypeScript types** consumed by both client and server:

- `sketch.ts` — Sketch request payloads, anti-spam serialization, result types
- `admin.ts` — Admin API request/response types
- `share.ts` — Share link encoding types

**Build order matters**: contracts must build before client or server (`npm run build` handles this).

## Routing

| Path | Description |
|------|-------------|
| `/` | Main live coding app (SPA) |
| `/s/:slug` | Server-rendered page for approved sketches |
| `/nest` | Admin moderation dashboard |
| `/api/*` | Server API endpoints |
| `/api/health` | Health check |
| `/storage/*` | Static screenshot storage |

## Environment Configuration

Environment is validated with Zod in `packages/server/src/config/env.ts`. Reads from root `.env` file.

### Required:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `ADMIN_API_TOKEN` | Bearer token for admin API |

### Required in production:

| Variable | Description |
|----------|-------------|
| `ANTI_SPAM_SECRET` | Challenge signing secret (≥32 chars) |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile server secret |
| `SCREENSHOT_PREVIEW_TOKEN` | Internal preview authentication (≥16 chars) |

### Optional:

| Variable | Description |
|----------|-------------|
| `HOST` / `PORT` | Server bind (default: `0.0.0.0:3000`) |
| `STATIC_DIR` | Override static asset directory |
| `PUBLIC_BASE_URL` | Canonical URL for SEO/CORS |
| `VITE_DEV_SERVER_URL` | Dev SSR proxy for slug pages |
| `RUNNER_PUBLIC_URL` | Runner origin for CSP/CORS |
| `SCREENSHOT_BASE_URL` | Internal URL for screenshot capture |
| `SCREENSHOT_STORAGE_DIR` | Persistent screenshot storage path |

### Client-side (`VITE_` prefix):

| Variable | Description |
|----------|-------------|
| `VITE_RUNNER_URL` | Full URL to iframe runner HTML |
| `VITE_RUNNER_PARENT_ORIGINS` | Allowed parent origins for runner |
| `VITE_MEDIA_PROXY_URL` | Media proxy endpoint URL |
| `VITE_API_BASE_URL` | Override API base URL |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile client key |
| `VITE_PUBLISH_CONSENT_POLICY_VERSION` | Consent policy version string |

See `.env.example` for a complete template with descriptions.

## Change Protocols

### When changing API response shapes:
1. Update Zod schemas in `packages/contracts/src/`
2. Rebuild contracts: `npm run build -w @synth.textmode.art/contracts`
3. Update server route handler in `packages/server/src/modules/`
4. Update client service in `packages/client/src/services/SketchApiService.ts`
5. Update admin types in `packages/client/src/features/admin/` if applicable

### When modifying engine behavior:
1. Check all three files in the engine folder: `*Engine.ts`, `*Controller.ts`, and the `editor/` and `runtime/` subdirectories
2. If changing the sandbox protocol, update `packages/client/src/sandbox/protocol.ts` **and** the runner's message handler in `packages/client/src/engines/textmode/runner/`
3. If adding new message types, update the type guards (`isRunnerMessage`, `isParentMessage`)

### When changing the Prisma schema:
1. Edit `packages/server/prisma/schema.prisma`
2. Create migration: `npm run -w @synth.textmode.art/server prisma:migrate`
3. Update corresponding contract types in `packages/contracts/`
4. Update affected server modules and client services

### When adding new shared types:
1. Add types/schemas in `packages/contracts/src/`
2. Export from the appropriate entry point (`index.ts`, `admin.ts`, `share.ts`, or `sketch.ts`)
3. Update `exports` map in `packages/contracts/package.json` if adding a new entry point
4. Rebuild contracts before testing

### When adding UI components:
- Use shadcn/ui primitives from `packages/client/src/shared/ui/`
- Follow existing patterns in `packages/client/src/components/` and `packages/client/src/features/`
- Use Radix UI primitives for accessible components
- Icons: `lucide-react`

## Code Style

### Formatting (Prettier):
- **Tabs** with 4-space width
- **Single quotes**
- Semicolons enabled
- Trailing commas (ES5)
- Print width: 120
- Arrow parens: always
- End of line: LF

### Import alias:
- `@` resolves to `packages/client/src/`
- `@synth.textmode.art/contracts` for shared contracts

### TypeScript:
- Strict mode
- ESM (`"type": "module"`) throughout
- Server uses `.js` extension in imports (for Node ESM resolution)

### ESLint:
- Separate configs per workspace: `packages/client/eslint.config.js`, `packages/server/eslint.config.js`

## Type Generation (Monaco)

Monaco Editor loads custom type definitions for `textmode.js`, `textmode.synth.js`, and `textmode.filters.js`:

1. **Script**: `packages/client/scripts/extractTypes.ts`
2. **Output**: `packages/client/src/engines/textmode/config/generatedTypes.ts`
3. **Consumer**: `packages/client/src/engines/textmode/editor/TextmodeEditor.ts`
4. **Regenerate**: `npm run extract-types`

> Do not manually edit `generatedTypes.ts` — it is auto-generated.

## Database

PostgreSQL with a single model:

```prisma
model SketchRequest {
  id, slug, status (PENDING/APPROVED/DENIED),
  title, description?, authorName?, license?,
  socialLinks? (JSON), textmodeCode, strudelCode?,
  publishConsent fields, ogImageUrl?,
  timestamps, review fields
}
```

## Validation

```bash
npm run lint             # ESLint (client + server)
npm run check-types      # TypeScript (contracts → client → server)
npm run format:check     # Prettier check
npm run build            # Full production build
```

No automated test suite is currently configured beyond lint/typecheck.

## Troubleshooting

- **If Monaco types are missing**: Run `npm run extract-types` and verify `generatedTypes.ts` exists in `packages/client/src/engines/textmode/config/`
- **If `/s/:slug` fails in dev**: Ensure server is running on `PORT` and Vite proxy is active in `packages/client/vite.config.ts`
- **If contracts aren't found**: Run `npm run build -w @synth.textmode.art/contracts` — contracts must build before `@synth.textmode.art/client` and `@synth.textmode.art/server`
- **If Prisma client errors**: Run `npm run -w @synth.textmode.art/server prisma:generate` after schema changes
- **If screenshot generation fails**: Ensure Playwright is installed (`npm run -w @synth.textmode.art/server playwright:install`) and `SCREENSHOT_BASE_URL` points to a running server
