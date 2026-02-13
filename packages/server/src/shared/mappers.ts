import type { SketchStatus, SocialLink } from '@synth.textmode.art/contracts/sketch';

export type SketchStatusLike = SketchStatus | 'PENDING' | 'APPROVED' | 'DENIED';

export function toIsoDate(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : value;
}

export function toSketchStatus(value: SketchStatusLike): SketchStatus {
    if (value === 'APPROVED' || value === 'DENIED') {
        return value;
    }
    return 'PENDING';
}

export function isSocialLink(value: unknown): value is SocialLink {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as { label?: unknown; url?: unknown };
    return (
        typeof candidate.label === 'string' &&
        candidate.label.length > 0 &&
        candidate.label.length <= 32 &&
        typeof candidate.url === 'string'
    );
}

export function toSocialLinks(raw: unknown): SocialLink[] | null {
    if (!Array.isArray(raw)) return null;

    const links: SocialLink[] = [];
    for (const item of raw) {
        if (isSocialLink(item)) {
            links.push({ label: item.label, url: item.url });
        }
    }
    return links;
}
