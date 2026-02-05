/**
 * Admin module shared types and constants
 */

export const TOKEN_STORAGE_KEY = 'admin_api_token';
export const SETTINGS_COLLAPSED_KEY = 'admin_settings_collapsed';

export type SketchStatus = 'PENDING' | 'APPROVED' | 'DENIED';

export type SocialLink = {
    label: string;
    url: string;
};

export type SketchRequest = {
    id: string;
    slug: string;
    status: SketchStatus;
    title: string;
    description: string | null;
    authorName: string | null;
    license: string | null;
    socialLinks: SocialLink[] | null;
    textmodeCode: string;
    strudelCode: string | null;
    ogImageUrl: string | null;
    createdAt: string;
    updatedAt: string;
    reviewedAt: string | null;
    reviewedBy: string | null;
    denialReason: string | null;
};

export type FilterOption = 'all' | 'pending' | 'approved' | 'denied';

export type StatusCounts = {
    all: number;
    PENDING: number;
    APPROVED: number;
    DENIED: number;
};
