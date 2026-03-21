import type { SocialLink } from '@synth.textmode.art/contracts/sketch';

export type SketchSummaryStatus = 'PENDING' | 'APPROVED';

export interface SketchSummary {
	status: SketchSummaryStatus;
	slug: string;
	title: string;
	description: string | null;
	authorName: string | null;
	license: string | null;
	socialLinks: SocialLink[] | null;
}

export type SketchMetaCardData = Omit<SketchSummary, 'status'> & { status?: SketchSummaryStatus };
