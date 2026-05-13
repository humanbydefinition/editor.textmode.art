import packageJson from '../../../package.json';

export type LegalRoute = 'imprint' | 'terms' | 'privacy';

export interface AppResourceLink {
	name: string;
	description: string;
	url: string;
	license: string;
}

const LEGAL_PATHS: Record<LegalRoute, string> = {
	imprint: '/imprint',
	terms: '/tos',
	privacy: '/privacy',
};

export const APP_META = {
	name: 'synth.textmode.art',
	description: 'a live coding environment for procedural text generation and ASCII synthesis.',
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
		repo: 'https://github.com/humanbydefinition/synth.textmode.art',
		license: 'https://github.com/humanbydefinition/synth.textmode.art/blob/main/LICENSE',
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
	] satisfies AppResourceLink[],
} as const;

export function buildLegalHref(route: LegalRoute, locale = 'en'): string {
	return `${LEGAL_PATHS[route]}?lang=${locale}`;
}
