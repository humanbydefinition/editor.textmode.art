# AGENTS.md

**synth.textmode.art**: Live coding environment for procedural text generation, ASCII synthesis, and algorithmic patterns. Built around [`textmode.js`](https://github.com/humanbydefinition/textmode.js) in a browser-based creative coding editor with real-time execution, share links, and admin moderation.

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
| **Server framework** | Fastify 5 |
| **Database** | PostgreSQL + Prisma 7 (with `@prisma/adapter-pg`) |
| **Notifications** | Discord.js (bot integration) |
| **Validation** | Zod (shared contracts) |
| **Testing** | Vitest (client + runner) |
| **Package manager** | npm (workspaces) |
| **License** | AGPL-3.0-or-later |

## Development Commands

Run from the **repo root**:

```bash
npm install                    # Install all workspace dependencies
npm run client:dev             # Start client dev server (Vite)
npm run server:dev             # Start server dev (Fastify + Prisma migrate)
npm run runner:dev             # Start runner dev server (Vite)
npm run build                  # Production build (contracts → client → server → runner)
npm run lint                   # Lint client + server + runner
npm run check-types            # Typecheck contracts → client → server → runner
npm run format                 # Prettier auto-format
npm run format:check           # Prettier check
npm run extract-types          # Regenerate Monaco type definitions
```

### Workspace-specific builds:

```bash
npm run client:build           # Build contracts + client only
npm run server:build           # Build contracts + server only
npm run runner:build           # Build runner only
```

### Server-specific:

```bash
npm run -w @synth.textmode.art/server prisma:migrate       # Create new migration
npm run -w @synth.textmode.art/server prisma:migrate:deploy # Deploy migrations
npm run -w @synth.textmode.art/server prisma:generate      # Regenerate Prisma client
npm run -w @synth.textmode.art/server prisma:studio        # Open Prisma Studio
npm run -w @synth.textmode.art/server playwright:install   # Install Chromium for screenshots
npm run -w @synth.textmode.art/server screenshots:regenerate # Regenerate all approved screenshots
```

### Testing:

```bash
npm run test -w @synth.textmode.art/client   # Run client tests (Vitest, jsdom)
npm run test -w @synth.textmode.art/runner   # Run runner tests (Vitest, node)
```

## Monorepo Structure

```
synth.textmode.art/
├── .env.example                         # Environment template with descriptions
├── package.json                         # Root workspace config & dev scripts
├── scripts/
│   └── check-max-lines.mjs             # Lint script for file length limits
└── packages/
    ├── client/                          # Vite + React SPA
    │   ├── tests/                       # Vitest tests (jsdom environment)
    │   └── src/
    │       ├── app/                     # Bootstrap, runtime, orchestration
    │       │   ├── bootstrap/           # startClientApp.ts (entry routing)
    │       │   ├── runtime/             # AppRuntime, EngineLifecycle, UIActions
    │       │   └── ui/                  # AppShell, RunnerUnavailableAlert, SlugInfoAlert
    │       ├── engines/                 # Engine implementations
    │       │   ├── registry.ts          # Engine registration
    │       │   ├── textmode/            # Visual engine
    │       │   │   ├── TextmodeEngine.ts
    │       │   │   ├── TextmodeController.ts
    │       │   │   ├── editor/          # TextmodeEditor (Monaco wrapper)
    │       │   │   ├── runtime/host/    # TextmodeRuntime (iframe host-side)
    │       │   │   ├── sandbox/         # Sandbox type definitions
    │       │   │   └── config/          # generatedTypes.ts (auto-generated)
    │       ├── platform/                # Platform services & infrastructure
    │       │   ├── api/                 # SketchApiService
    │       │   ├── audio/               # AudioService
    │       │   ├── storage/             # StorageService
    │       │   ├── state/               # Zustand store + slices + adapters + selectors
    │       │   ├── input/               # EditorManager, ShortcutsManager
    │       │   ├── ui/                  # Popover events
    │       │   └── compat/              # Monaco clipboard shim
    │       ├── features/                # Feature modules
    │       │   ├── admin/               # Moderation dashboard (AdminApp)
    │       │   ├── editor-layout/       # Editor layout model & UI
    │       │   ├── examples/            # Example sketches content & UI
    │       │   ├── publish/             # Sketch publish flow + Turnstile
    │       │   ├── share/               # Share link model & UI
    │       │   └── system-menu/         # System menu UI
    │       ├── shared/                  # Shared code
    │       │   ├── ui/                  # shadcn/ui primitives
    │       │   ├── components/          # Reusable React components (ErrorOverlay, WelcomeDialog, etc.)
    │       │   ├── lib/                 # Utilities (cn, CodeRandomizer, ShareService)
    │       │   └── types/               # Shared TypeScript types
    │       ├── core/                    # Base classes (BaseController, BaseEditor, engine.types)
    │       └── styles/                  # CSS entry point
    │
    ├── runner/                          # Isolated iframe runner bundle (separate Vite build)
    │   ├── tests/                       # Vitest tests (node environment)
    │   ├── textmode.html                # Textmode runner entry HTML
    │   └── src/
    │       ├── TextmodeRunner.ts        # Main textmode runner class
    │       ├── core/                    # Bootstrap, runner lifecycle, security
    │       ├── execution/               # ExecutionContext, SafeProxyFactory
    │       ├── sandbox/                 # Error handling, scheduling
    │       ├── lib/                     # TextmodeManager, textmode type helpers
    │       └── types/                   # Internal runner types
    │
    ├── server/                          # Fastify API server
    │   ├── tests/                       # (none currently)
    │   ├── src/
    │   │   ├── app.ts                   # Application orchestrator (plugin + route registration)
    │   │   ├── config/env.ts            # Zod-validated environment config
    │   │   ├── modules/                 # Feature modules
    │   │   │   ├── admin/               # Admin routes, service, mapper
    │   │   │   ├── sketches/            # Public sketch routes, service, mapper
    │   │   │   ├── submissions/         # Sketch publish routes + service
    │   │   │   ├── slug-page/           # Server-rendered SEO pages + template
    │   │   │   ├── screenshot/          # Playwright OG image generation
    │   │   │   ├── media/               # CORS proxy for external media
    │   │   │   └── discord/             # Discord bot notification service
    │   │   ├── plugins/                 # Fastify plugins
    │   │   │   ├── cors.ts
    │   │   │   ├── database.ts
    │   │   │   ├── discord.ts           # Discord bot lifecycle plugin
    │   │   │   ├── error-handler.ts
    │   │   │   ├── runner-csp.ts        # CSP headers for runner iframe
    │   │   │   ├── security-headers.ts  # Helmet security headers
    │   │   │   └── static-files.ts      # Static file serving + SPA fallback
    │   │   ├── middleware/              # admin-auth middleware
    │   │   ├── security/               # anti-spam.guard, turnstile.guard
    │   │   ├── database/               # Prisma client & lifecycle
    │   │   ├── generated/              # Prisma generated client output
    │   │   └── shared/                 # Utilities (mappers, slug, errors, net)
    │   ├── scripts/                    # Utility scripts (test-screenshot, regenerate, backfill)
    │   └── prisma/
    │       └── schema.prisma           # Database schema
    │
    └── contracts/                       # Shared types & validation (client ↔ server ↔ runner)
        └── src/
            ├── index.ts                 # Re-exports
            ├── sketch.ts                # Sketch request types + anti-spam serialization
            ├── admin.ts                 # Admin API types
            ├── share.ts                 # Share link encoding types
            └── runner/                  # Iframe message protocols
                ├── textmode.ts          # Textmode runner protocol (INIT, RUN_CODE, etc.)
```

## Key Architectures

### Engine Pattern

The textmode engine follows a consistent **Engine + Editor + Runtime + Controller** pattern:

- **Engine**: Top-level orchestrator that wires the editor, runtime, and controller together
- **Editor**: Monaco Editor wrapper with engine-specific language support and keybindings
- **Runtime**: Execution environment hosted in an isolated iframe
- **Controller**: Mediates between editor and runtime; handles auto-execute, debouncing, and state sync

Engines are initialized by `AppRuntime` (the composition root at `packages/client/src/app/runtime/AppRuntime.ts`), which orchestrates lifecycle, settings, share workflows, and rendering via `EngineLifecycle` and `UIActions`.

### Runner Package

The `packages/runner/` package is a **standalone Vite build** that produces the isolated iframe bundle. It has one entry point:

- `textmode.html` — Textmode visual runner (textmode.js + textmode.synth.js + textmode.filters.js)

The runner dependencies (`textmode.js`, `textmode.synth.js`, `textmode.filters.js`) live in the **runner** package. The client only has these as devDependencies for type extraction.

The runner can be hosted on a separate origin (`VITE_RUNNER_URL`) for security isolation.

### Sandbox Protocols

The runner uses typed message protocols defined in `@synth.textmode.art/contracts/runner/*`:

**Textmode protocol** (`contracts/src/runner/textmode.ts`):

- **Window → Runner**: `INIT` (versioned handshake, `PROTOCOL_VERSION = 1`)
- **Parent → Runner**: `RUN_CODE`, `SOFT_RESET`, `DISPOSE`, `AUDIO_DATA`
- **Runner → Parent**: `READY`, `RUN_OK`, `RUN_ERROR`, `SYNTH_ERROR`, `TOGGLE_UI`, `USER_INTERACTION`
- Type guards: `isInitMessage()`, `isParentMessage()`, `isRunnerMessage()`

### State Management

Zustand store at `packages/client/src/platform/state/appStore.ts` is composed from four domain slices:

| Slice | Concern |
|-------|---------|
| `settingsSlice` | App settings (font size, auto-execute, editor preferences) |
| `engineSlice` | Engine states and custom per-engine data |
| `shareSlice` | Share link loading, URL parsing, lock state |
| `uiSlice` | Panel visibility, window dimensions, responsive layout |

Store uses `devtools` (dev only) and `subscribeWithSelector` middleware. Selectors live in `selectors.ts`, store adapters in `adapters/`.

### Server Architecture

The server uses a **Layered Architecture** to separate concerns:

1.  **Plugins (`plugins/`)**: Cross-cutting concerns (CORS, Helmet, Error Handling, Database Lifecycle, Discord) registered in `app.ts`.
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
| `discord` | Discord bot notifications for submissions | Service only (no HTTP routes) |

### Discord Integration

The server includes a Discord bot integration (`discord.js`) that notifies configured channels about sketch submissions and approvals:

- **Plugin**: `plugins/discord.ts` — initializes and tears down the Discord client
- **Service**: `modules/discord/discord.service.ts` — singleton service for sending embeds
- **Config**: Requires `DISCORD_BOT_TOKEN`, `DISCORD_CHANNEL_ID`, and optionally `DISCORD_APPROVED_CHANNEL_ID`

### Anti-Spam System

Sketch submissions use a **proof-of-work challenge** system:
1. Client requests challenge from `GET /api/sketch-requests/challenge`
2. Client solves SHA-256 leading-zero-bits puzzle (`sha256-leading-zero-bits-v1`)
3. Client submits with nonce, challenge ID, payload hash, and Cloudflare Turnstile token
4. Server validates challenge, PoW, Turnstile, and idempotency

Tunable via environment variables: `ANTI_SPAM_POW_DIFFICULTY`, `ANTI_SPAM_CHALLENGE_TTL_SECONDS`, `ANTI_SPAM_MAX_CHALLENGES_PER_MINUTE`, `ANTI_SPAM_MAX_SUBMISSIONS_PER_MINUTE`, `ANTI_SPAM_MAX_PENDING_REQUESTS`, `ANTI_SPAM_IDEMPOTENCY_TTL_SECONDS`.

### Shared Contracts

The `@synth.textmode.art/contracts` package provides **shared Zod schemas, TypeScript types, and message protocols** consumed by client, server, and runner:

| Export path | Content |
|-------------|---------|
| `.` | Re-exports (index) |
| `./sketch` | Sketch request payloads, anti-spam serialization, result types |
| `./admin` | Admin API request/response types |
| `./share` | Share link encoding types |
| `./runner/textmode` | Textmode iframe message protocol + type guards |

**Build order matters**: contracts must build before client, server, or runner (`npm run build` handles this).

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

### Optional (server):

| Variable | Description |
|----------|-------------|
| `HOST` / `PORT` | Server bind (default: `0.0.0.0:3000`) |
| `STATIC_DIR` | Override static asset directory |
| `PUBLIC_BASE_URL` | Canonical URL for SEO/CORS |
| `RUNNER_PUBLIC_URL` | Runner origin for CSP/CORS |
| `SCREENSHOT_BASE_URL` | Internal URL for screenshot capture |
| `SCREENSHOT_STORAGE_DIR` | Persistent screenshot storage path |
| `PUBLISH_CONSENT_POLICY_VERSION` | Consent policy version (default: `2026-02-08`) |
| `DISCORD_BOT_TOKEN` | Discord bot token for notifications |
| `DISCORD_CHANNEL_ID` | Discord channel for new submission alerts |
| `DISCORD_APPROVED_CHANNEL_ID` | Discord channel for approval announcements |

### Optional (anti-spam tuning):

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTI_SPAM_POW_DIFFICULTY` | `14` | Leading zero bits (8–24) |
| `ANTI_SPAM_CHALLENGE_TTL_SECONDS` | `180` | Challenge validity window |
| `ANTI_SPAM_MAX_CHALLENGES_PER_MINUTE` | `600` | Rate limit: challenges |
| `ANTI_SPAM_MAX_SUBMISSIONS_PER_MINUTE` | `60` | Rate limit: submissions |
| `ANTI_SPAM_MAX_PENDING_REQUESTS` | `5000` | Max pending sketch requests |
| `ANTI_SPAM_IDEMPOTENCY_TTL_SECONDS` | `600` | Idempotency key lifetime |

### Client-side (`VITE_` prefix):

| Variable | Description |
|----------|-------------|
| `VITE_RUNNER_URL` | Full URL to textmode runner HTML |
| `VITE_RUNNER_PARENT_ORIGINS` | Allowed parent origins for runner iframe |
| `VITE_MEDIA_PROXY_URL` | Media proxy endpoint URL |
| `VITE_API_BASE_URL` | Override API base URL |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile client key |
| `VITE_PUBLISH_CONSENT_POLICY_VERSION` | Consent policy version string |
| `VITE_DEV_SERVER_URL` | Dev SSR proxy for slug pages |

See `.env.example` for a complete template with descriptions.

## Change Protocols

### When changing API response shapes:
1. Update Zod schemas in `packages/contracts/src/`
2. Rebuild contracts: `npm run build -w @synth.textmode.art/contracts`
3. Update server route handler in `packages/server/src/modules/`
4. Update client service in `packages/client/src/platform/api/SketchApiService.ts`
5. Update admin types in `packages/client/src/features/admin/` if applicable

### When modifying engine behavior:
1. Check all files in the engine folder: `*Engine.ts`, `*Controller.ts`, and the `editor/` and `runtime/` subdirectories
2. If changing a sandbox protocol, update the contract in `packages/contracts/src/runner/textmode.ts`
3. Update the corresponding runner implementation in `packages/runner/src/`
4. If adding new message types, update the relevant type guards
5. Run protocol contract tests: `npm run test -w @synth.textmode.art/client`

### When changing the Prisma schema:
1. Edit `packages/server/prisma/schema.prisma`
2. Create migration: `npm run -w @synth.textmode.art/server prisma:migrate`
3. Update corresponding contract types in `packages/contracts/`
4. Update affected server modules and client services

### When adding new shared types:
1. Add types/schemas in `packages/contracts/src/`
2. Export from the appropriate entry point (`index.ts`, `admin.ts`, `share.ts`, `sketch.ts`, or `runner/*.ts`)
3. Update `exports` map in `packages/contracts/package.json` if adding a new entry point
4. Rebuild contracts before testing

### When adding UI components:
- Use shadcn/ui primitives from `packages/client/src/shared/ui/`
- Follow existing patterns in `packages/client/src/shared/components/` and `packages/client/src/features/`
- Use Radix UI primitives for accessible components
- Icons: `lucide-react`

### When modifying the runner:
1. Edit runner source in `packages/runner/src/`
2. If protocol changes, update contracts first (`packages/contracts/src/runner/`)
3. Run runner tests: `npm run test -w @synth.textmode.art/runner`
4. Verify build produces expected entries: `npm run runner:build`
## Code Style

### Formatting (Prettier):
- **Tabs** with 4-space width
- **Single quotes**
- Semicolons enabled
- Trailing commas (ES5)
- Print width: 120
- Arrow parens: always
- End of line: LF

### Import aliases:
- `@` resolves to `packages/client/src/` (client and runner)
- `@synth.textmode.art/contracts` for shared contracts
- `@synth.textmode.art/contracts/runner/textmode` for textmode protocol

### TypeScript:
- Strict mode
- ESM (`"type": "module"`) throughout
- Server uses `.js` extension in imports (for Node ESM resolution)

### ESLint:
- Separate configs per workspace: `packages/client/eslint.config.js`, `packages/server/eslint.config.js`, `packages/runner/eslint.config.js`

## Type Generation (Monaco)

Monaco Editor loads custom type definitions for `textmode.js`, `textmode.synth.js`, and `textmode.filters.js`:

1. **Script**: `packages/client/scripts/extractTypes.ts`
2. **Output**: `packages/client/src/engines/textmode/config/generatedTypes.ts`
3. **Consumer**: `packages/client/src/engines/textmode/editor/TextmodeEditor.ts`
4. **Regenerate**: `npm run extract-types`

> Do not manually edit `generatedTypes.ts` — it is auto-generated.

The type extraction reads from the textmode libraries installed as devDependencies in the client package.

## Database

PostgreSQL with Prisma 7 (`@prisma/adapter-pg`). Single model:

```prisma
model SketchRequest {
  id, slug, status (PENDING/APPROVED/DENIED),
  title, description?, authorName?, license?,
  socialLinks? (JSON), textmodeCode,
  publishConsentAccepted, publishConsentAcceptedAt?,
  publishConsentPolicyVersion?, ogImageUrl?,
  createdAt, updatedAt,
  reviewedAt?, reviewedBy?, denialReason?
}
```

Generated client output goes to `packages/server/src/generated/prisma/`.

## Testing

```bash
npm run test -w @synth.textmode.art/client   # Client tests (jsdom)
npm run test -w @synth.textmode.art/runner   # Runner tests (node)
```

Client tests cover protocol contracts. Runner tests cover origin validation and runner lifecycle.

## Validation

```bash
npm run lint             # ESLint (client + server + runner)
npm run check-types      # TypeScript (contracts → client → server → runner)
npm run format:check     # Prettier check
npm run build            # Full production build (contracts → client → server → runner)
```

## Troubleshooting

- **If Monaco types are missing**: Run `npm run extract-types` and verify `generatedTypes.ts` exists in `packages/client/src/engines/textmode/config/`
- **If `/s/:slug` fails in dev**: Ensure server is running on `PORT` and Vite proxy is active in `packages/client/vite.config.ts`
- **If contracts aren't found**: Run `npm run build -w @synth.textmode.art/contracts` — contracts must build before client, server, and runner
- **If Prisma client errors**: Run `npm run -w @synth.textmode.art/server prisma:generate` after schema changes
- **If screenshot generation fails**: Ensure Playwright is installed (`npm run -w @synth.textmode.art/server playwright:install`) and `SCREENSHOT_BASE_URL` points to a running server
- **If Discord notifications fail**: Verify `DISCORD_BOT_TOKEN` and `DISCORD_CHANNEL_ID` are set; check server logs for `[Discord] Setup failed`
