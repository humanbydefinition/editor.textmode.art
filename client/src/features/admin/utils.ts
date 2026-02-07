/**
 * Admin module utility functions
 */

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
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return link;
        }

        const handle = url.startsWith('@') ? url.slice(1) : url;
        const [user, host] = handle.split('@');
        if (user && host) {
            return { ...link, url: `https://${host}/@${user}` };
        }
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return { ...link, url: `https://${url}` };
    }

    return link;
}
