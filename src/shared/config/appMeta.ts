import packageJson from '../../../package.json';

export type LegalRoute = 'imprint' | 'terms' | 'privacy';

export interface AppResourceLink {
	name: string;
	description: string;
	url: string;
	license: string;
}

const LEGAL_PATHS: Record<LegalRoute, string> = {
	imprint: 'imprint',
	terms: 'tos',
	privacy: 'privacy',
};

export const LEGAL_LINKS = [
	{ label: 'imprint', route: 'imprint' },
	{ label: 'terms', route: 'terms' },
	{ label: 'privacy', route: 'privacy' },
] as const satisfies ReadonlyArray<{ label: string; route: LegalRoute }>;

export const APP_META = {
	name: 'editor.textmode.art',
	description: 'a browser-based textmode.js editor for live coding, ASCII art, and textmode synthesis.',
	version: packageJson.version,
	licenseLabel: 'GNU AGPLv3',
	author: {
		name: 'humanbydefinition',
		shortName: 'hbd',
		profileUrl: 'https://github.com/humanbydefinition',
		avatarUrl: 'https://github.com/humanbydefinition.png',
	},
	contactEmail: 'hello@textmode.art',
	urls: {
		support: 'https://code.textmode.art/docs/support',
		repo: 'https://github.com/humanbydefinition/editor.textmode.art',
		galleryContributionGuide:
			'https://github.com/humanbydefinition/editor.textmode.art/blob/main/sketches/README.md',
		galleryPullRequest: 'https://github.com/humanbydefinition/editor.textmode.art/compare',
		license: 'https://github.com/humanbydefinition/editor.textmode.art/blob/main/LICENSE',
		discord: 'https://discord.gg/sjrw8QXNks',
	},
	resources: [
		{
			name: 'textmode.js',
			description: 'core textmode library',
			url: 'https://github.com/humanbydefinition/textmode.js',
			license: 'MIT',
		},
		{
			name: 'textmode.synth.js',
			description: 'synthesis add-on library',
			url: 'https://github.com/humanbydefinition/textmode.synth.js',
			license: 'AGPLv3',
		},
		{
			name: 'textmode.filters.js',
			description: 'filter add-on library',
			url: 'https://github.com/humanbydefinition/textmode.filters.js',
			license: 'MIT',
		},
		{
			name: 'textmode.export.js',
			description: 'export add-on library',
			url: 'https://github.com/humanbydefinition/textmode.export.js',
			license: 'MIT',
		},
		{
			name: 'textmode.figlet.js',
			description: 'FIGlet font add-on library',
			url: 'https://github.com/humanbydefinition/textmode.figlet.js',
			license: 'MIT',
		},
	] satisfies AppResourceLink[],
} as const;

export function buildLegalHref(route: LegalRoute, locale = 'en'): string {
	return `https://legal.textmode.art/projects/editor.textmode.art/${locale}/${LEGAL_PATHS[route]}`;
}
