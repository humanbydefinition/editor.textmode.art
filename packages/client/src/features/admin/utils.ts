/**
 * Admin module utility functions
 */

import { normalizeMastodonUrl } from '@synth.textmode.art/contracts/sketch';
import type { SocialLink, SketchRequest } from './types';

/**
 * Format a date string for display
 */
export function formatDate(value?: string | null): string {
    if (!value) return 'N/A';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';

    return date.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Safely extract social links from a request
 */
export function getLinks(raw: SketchRequest['socialLinks']): SocialLink[] {
    return Array.isArray(raw) ? raw : [];
}

/**
 * Normalize social link URLs (handle Mastodon handles, add https://)
 */
export function normalizeSocialLink(link: SocialLink): SocialLink {
    const label = link.label.trim();
    const url = link.url.trim();

    if (label.toLowerCase() === 'mastodon') {
        return { ...link, url: normalizeMastodonUrl(url) };
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return { ...link, url: `https://${url}` };
    }

    return link;
}

/**
 * Extract a readable API error message from either JSON or plain text responses.
 */
export async function getApiErrorMessage(response: Response, fallback: string): Promise<string> {
    try {
        const payload = (await response.clone().json()) as { error?: unknown; message?: unknown };
        const message = typeof payload.error === 'string' ? payload.error : payload.message;
        if (typeof message === 'string' && message.trim().length > 0) {
            return message;
        }
    } catch {
        // Fall through to text response parsing.
    }

    try {
        const text = (await response.text()).trim();
        if (text.length > 0) {
            return text;
        }
    } catch {
        // Ignore and return fallback.
    }

    return fallback;
}
