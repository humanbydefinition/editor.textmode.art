import type { SocialLink } from '@synth.textmode.art/contracts/sketch';

export type SlugSketchStatus = 'PENDING' | 'APPROVED';

export interface SlugSketchInfo {
	status: SlugSketchStatus;
	slug: string;
	title: string;
	description: string | null;
	authorName: string | null;
	license: string | null;
	socialLinks: SocialLink[] | null;
}

export type SlugInfoCardSketch = Omit<SlugSketchInfo, 'status'> & { status?: SlugSketchStatus };
