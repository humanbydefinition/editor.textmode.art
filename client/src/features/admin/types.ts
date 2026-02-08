/**
 * Admin module shared types and constants
 */
import type { AdminSketchRequest } from '@synth.textmode.art/contracts/admin';
import type { SocialLink, SketchStatus } from '@synth.textmode.art/contracts/sketch';

export const TOKEN_STORAGE_KEY = 'admin_api_token';
export const REVIEWER_STORAGE_KEY = 'admin_reviewer_name';
export const SETTINGS_COLLAPSED_KEY = 'admin_settings_collapsed';

export type { SocialLink, SketchStatus };
export type SketchRequest = AdminSketchRequest;

export type FilterOption = 'all' | 'pending' | 'approved' | 'denied';

export type StatusCounts = {
    all: number;
    PENDING: number;
    APPROVED: number;
    DENIED: number;
};
