/**
 * Admin module utility functions
 */

import type { SocialLink, SketchRequest } from './types';

/**
 * Format a date string for display
 */
export function formatDate(value?: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString();
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

    // Handle Mastodon handles (@user@instance.social)
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

    // Add https:// if no protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return { ...link, url: `https://${url}` };
    }

    return link;
}
