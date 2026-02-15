import { useEffect } from 'react';
import { buildLocalizedLegalPath, type LegalLocale } from '@/features/legal/model/legalLocale';

const MANAGED_SEO_ATTR = 'data-legal-seo-managed';

function upsertLink(rel: string, attributes: Record<string, string>): void {
	const selectorParts = [`link[${MANAGED_SEO_ATTR}="true"]`, `[rel="${rel}"]`];
	if (attributes.hreflang) {
		selectorParts.push(`[hreflang="${attributes.hreflang}"]`);
	}
	const selector = selectorParts.join('');
	let link = document.head.querySelector<HTMLLinkElement>(selector);

	if (!link) {
		link = document.createElement('link');
		document.head.appendChild(link);
	}

	link.setAttribute(MANAGED_SEO_ATTR, 'true');
	link.setAttribute('rel', rel);
	for (const [key, value] of Object.entries(attributes)) {
		link.setAttribute(key, value);
	}
}

export function useLegalSeo(locale: LegalLocale, legalPath: '/imprint' | '/tos' | '/privacy' | '/contact', title: string): void {
	useEffect(() => {
		if (typeof document === 'undefined' || typeof window === 'undefined') return;

		document.title = `${title} | synth.textmode.art`;

		const origin = window.location.origin;
		const canonicalPath = buildLocalizedLegalPath(legalPath, locale);
		const canonicalHref = `${origin}${canonicalPath}`;
		upsertLink('canonical', { href: canonicalHref });

		for (const legalLocale of ['en', 'de'] as const) {
			const href = `${origin}${buildLocalizedLegalPath(legalPath, legalLocale)}`;
			upsertLink('alternate', { hreflang: legalLocale, href });
		}

		upsertLink('alternate', {
			hreflang: 'x-default',
			href: `${origin}${buildLocalizedLegalPath(legalPath, 'en')}`,
		});

		return () => {
			document.head.querySelectorAll(`link[${MANAGED_SEO_ATTR}="true"]`).forEach((node) => node.remove());
		};
	}, [legalPath, locale, title]);
}
