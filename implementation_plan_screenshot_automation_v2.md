# Implementation Plan: Automated Social Preview Screenshots (v2)

## Objective
Automate the generation of social preview images (OG images) for sketches when they are approved by an admin. This improves SEO and social sharing engagement.

## Analysis & Approach
The previous plan proposed a "Screenshot Mode" within the main React application. However, a cleaner and more robust approach is to create a dedicated, lightweight "rendering page" served by the backend. This page will be responsible solely for executing the sketch code in a minimal environment, allowing for precise screenshots without the overhead or complexity of the full frontend application.

### Key Concepts
1.  **Dedicated Preview Route (`/preview/:slug`)**: A server-served HTML page that loads the necessary `textmode` libraries and injects the user's sketch code directly.
2.  **Direct Canvas Screenshot**: Playwright will target the `<canvas>` element specifically, ensuring the generated image is exactly the art itself, with no UI chrome.
3.  **Environment Replication**: The preview page will replicate the execution context (globals like `t`, `osc`, `src`) provided by the main application's runner, ensuring sketches render identically.

## Architecture

### 1. Server: Preview Template & Route
We will implement a new route in the server application that serves a raw HTML file.
-   **Route**: `GET /preview/:slug`
-   **Behavior**:
    1.  Fetches the sketch from the database.
    2.  Reads a `preview.html` template file.
    3.  Injects the necessary library imports (via CDN for simplicity and isolation).
    4.  Injects the sketch's `textmodeCode` into the template.
    5.  Returns the rendered HTML.

### 2. Server: Screenshot Service
We will integrate `playwright` into the server to handle the browser automation.
-   **Service**: `ScreenshotService`
-   **Trigger**: Admin approval of a sketch.
-   **Process**:
    1.  Launch Playwright (headless).
    2.  Navigate to `http://localhost:<PORT>/preview/<slug>`.
    3.  Wait for the sketch to report readiness (via `data-ready` attribute).
    4.  Select the `canvas` element and take a screenshot.
    5.  Save the image to local storage (`server/storage`).
    6.  Update the database record with the image URL.

## Implementation Steps

### Phase 1: Server Preview Route

#### 1.1 Create Preview Template
**File:** `server/src/modules/screenshot/templates/preview.html`
-   Create an HTML file that:
    -   Imports `textmode.js`, `textmode.synth.js`, and `textmode.filters.js` (matching project versions) via a reliable CDN (e.g., `esm.sh`).
    -   Sets up the `textmode` instance (`t`) and attaches it to the body.
    -   Exposes the standard global functions (`src`, `osc`, `noise`, etc.) to the `window` object.
    -   Includes a "Readiness Poller" script that checks for `t.frameCount > 0` and sets `document.body.dataset.ready = "true"`.
    -   Contains a specific placeholder (e.g., `/* SKETCH_CODE_INJECTION */`) for the user code.

#### 1.2 Implement Preview Handler
**File:** `server/src/modules/screenshot/preview.routes.ts`
-   Create a Fastify route `GET /preview/:slug`.
-   Logic:
    -   Query DB for `SketchRequest` by slug.
    -   Read `preview.html`.
    -   Replace placeholder with `sketch.textmodeCode`.
    -   Send `text/html` response.

### Phase 2: Screenshot Service

#### 2.1 Dependencies
**Action:** Install `playwright` in the server package.
```bash
cd server
npm install playwright
npx playwright install chromium --with-deps
```

#### 2.2 Implement Service
**File:** `server/src/modules/screenshot/screenshot.service.ts`
-   Class `ScreenshotService`:
    -   Method `capture(slug: string): Promise<string>`
    -   Url: `http://localhost:${env.PORT}/preview/${slug}`
    -   Playwright logic:
        ```typescript
        const browser = await chromium.launch();
        const page = await browser.newPage();
        await page.goto(url);
        await page.waitForSelector('body[data-ready="true"]', { timeout: 10000 });
        const element = await page.locator('canvas');
        const buffer = await element.screenshot();
        await browser.close();
        // ... save buffer to file ...
        ```
    -   Save to `server/storage/${slug}.png`.
    -   Return public URL.

### Phase 3: Integration

#### 3.1 Hook into Admin Approval
**File:** `server/src/modules/admin/admin.routes.ts`
-   In the `PATCH /api/admin/sketch-requests/:id` handler:
    -   If status is changing to `APPROVED`:
        -   Call `screenshotService.capture(sketch.slug)`.
        -   Update `ogImageUrl` in the database.
        -   (Ideally, do this in a background job or fire-and-forget promise to not block the response).

#### 3.2 Static File Serving
**File:** `server/src/app.ts`
-   Ensure `@fastify/static` is configured to serve `server/storage` at the `/storage` prefix (if not already).

## Verification Plan

1.  **Manual Preview Test**:
    -   Start server.
    -   Navigate to `http://localhost:3000/preview/some-existing-slug`.
    -   Verify the sketch renders correctly in the browser window without any UI.
2.  **Screenshot Test**:
    -   Use a script or temporary endpoint to trigger `screenshotService.capture('some-slug')`.
    -   Check `server/storage` for the generated file.
    -   Verify the image only contains the canvas content.
3.  **End-to-End**:
    -   Approve a sketch in the Admin UI.
    -   Verify the network request completes.
    -   Verify the `ogImageUrl` is updated in the DB.
    -   Verify the image is accessible via the returned URL.
