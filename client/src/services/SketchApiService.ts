/**
 * Service for interacting with the sketch API.
 * Handles fetching approved sketches and submitting publish requests.
 */

import type {
    ApprovedSketch,
    SketchRequestPayload,
    SketchRequestResult,
    SlugAvailabilityResult,
} from '@synth.textmode.art/contracts/sketch';

function getApiBase(): string {
    // In production, API is served from same origin
    // In dev, we might need to proxy or use the server port
    if (import.meta.env.DEV) {
        return 'http://localhost:3000';
    }
    return '';
}

/**
 * Fetch an approved sketch by slug.
 * Returns null if not found or not approved.
 */
export async function fetchApprovedSketch(slug: string): Promise<ApprovedSketch | null> {
    try {
        const response = await fetch(`${getApiBase()}/api/sketches/${encodeURIComponent(slug)}`);
        if (!response.ok) {
            return null;
        }
        return (await response.json()) as ApprovedSketch;
    } catch {
        console.warn(`[SketchApiService] Failed to fetch sketch: ${slug}`);
        return null;
    }
}

/**
 * Fetch a random approved sketch.
 * Optionally exclude a specific slug from selection.
 */
export async function fetchRandomApprovedSketch(excludeSlug?: string): Promise<ApprovedSketch | null> {
    try {
        const query = excludeSlug
            ? `?excludeSlug=${encodeURIComponent(excludeSlug)}`
            : '';
        const response = await fetch(`${getApiBase()}/api/sketches/random${query}`);
        if (!response.ok) {
            return null;
        }
        return (await response.json()) as ApprovedSketch;
    } catch {
        console.warn('[SketchApiService] Failed to fetch random sketch');
        return null;
    }
}

/**
 * Check if a slug is available for use.
 */
export async function checkSlugAvailability(slug: string): Promise<SlugAvailabilityResult> {
    try {
        const response = await fetch(
            `${getApiBase()}/api/sketch-requests/slug-available?slug=${encodeURIComponent(slug)}`
        );
        if (!response.ok) {
            return { available: false, slug, reason: 'Failed to check availability' };
        }
        return (await response.json()) as SlugAvailabilityResult;
    } catch {
        return { available: false, slug, reason: 'Network error' };
    }
}

/**
 * Submit a new sketch request for moderation.
 */
export async function submitSketchRequest(
    payload: SketchRequestPayload
): Promise<{ success: true; data: SketchRequestResult } | { success: false; error: string }> {
    try {
        const response = await fetch(`${getApiBase()}/api/sketch-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = (await response.json().catch(() => ({}))) as { error?: string };
            return { success: false, error: errorData.error || `Request failed: ${response.status}` };
        }

        const data = (await response.json()) as SketchRequestResult;
        return { success: true, data };
    } catch {
        return { success: false, error: 'Network error' };
    }
}
