import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertOgPng, OG_HEIGHT, OG_WIDTH } from '@textmode/og';
import type { GallerySketchMeta } from '../../src/features/gallery-sketches/model/metadata';
import { readGalleryEntries, type GalleryEntry } from './project';

const projectRoot = path.resolve(import.meta.dirname, '../..');

const SITE_BASE = 'https://editor.textmode.art';

export async function publishGallerySocialPages(root: string): Promise<number> {
	const entries = await readGalleryEntries(root);
	const distDirectory = path.resolve(root, 'dist');

	await Promise.all([
		assertOgPng(path.resolve(root, 'public', 'og.png')),
		assertOgPng(path.join(distDirectory, 'og.png')),
	]);
	await publishSitemap(distDirectory, entries);
	if (entries.length === 0) return 0;

	const baseHtml = await readFile(path.join(distDirectory, 'index.html'), 'utf8');
	const ogDirectory = path.join(distDirectory, 'og');
	await Promise.all(entries.map((entry) => assertOgPng(entry.ogPath)));
	await mkdir(ogDirectory, { recursive: true });

	for (const entry of entries) {
		await copyFile(entry.ogPath, path.join(ogDirectory, `${entry.meta.slug}.png`));
		const routeDirectory = path.join(distDirectory, 's', entry.meta.slug);
		await mkdir(routeDirectory, { recursive: true });
		await writeFile(path.join(routeDirectory, 'index.html'), renderGallerySocialHtml(baseHtml, entry.meta), 'utf8');
	}

	return entries.length;
}

function renderGallerySocialHtml(baseHtml: string, meta: GallerySketchMeta): string {
	const canonicalUrl = `${SITE_BASE}/s/${meta.slug}/`;
	const imageUrl = `${SITE_BASE}/og/${meta.slug}.png`;
	const title = `${meta.title} | editor.textmode.art`;
	const authorName = meta.authorName?.trim() || null;
	const description =
		meta.description?.trim() || `A textmode.js gallery sketch by ${authorName ?? 'an anonymous contributor'}.`;
	const alt = `${meta.title} by ${authorName ?? 'an anonymous contributor'} on editor.textmode.art`;
	const dynamicHead = `
	<title>${escapeMarkup(title)}</title>
	<link rel="canonical" href="${canonicalUrl}" />
	<meta name="description" content="${escapeMarkup(description)}" />
	<meta name="robots" content="index, follow" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="editor.textmode.art" />
	<meta property="og:url" content="${canonicalUrl}" />
	<meta property="og:title" content="${escapeMarkup(title)}" />
	<meta property="og:description" content="${escapeMarkup(description)}" />
	<meta property="og:image" content="${imageUrl}" />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="${OG_WIDTH}" />
	<meta property="og:image:height" content="${OG_HEIGHT}" />
	<meta property="og:image:alt" content="${escapeMarkup(alt)}" />
	<meta property="og:locale" content="en_US" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:url" content="${canonicalUrl}" />
	<meta name="twitter:title" content="${escapeMarkup(title)}" />
	<meta name="twitter:description" content="${escapeMarkup(description)}" />
	<meta name="twitter:image" content="${imageUrl}" />
	<meta name="twitter:image:alt" content="${escapeMarkup(alt)}" />
`;

	const stripped = baseHtml
		.replace(/<title>[\s\S]*?<\/title>/i, '')
		.replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '')
		.replace(/<meta\s+name=["'](?:description|robots)["'][^>]*>/gi, '')
		.replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, '')
		.replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, '');

	if (!stripped.includes('</head>')) throw new Error('Built index.html is missing </head>.');
	return stripped.replace('</head>', `${dynamicHead}</head>`);
}

function escapeMarkup(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}

async function publishSitemap(distDirectory: string, entries: readonly GalleryEntry[]): Promise<void> {
	const locations = [
		{ loc: `${SITE_BASE}/`, changefreq: 'daily', priority: '1.0' },
		...entries.map((entry) => ({
			loc: `${SITE_BASE}/s/${entry.meta.slug}/`,
			changefreq: 'weekly',
			priority: '0.8',
		})),
	];
	const urlElements = locations
		.map(
			({ loc, changefreq, priority }) =>
				`	<url>\n		<loc>${loc}</loc>\n		<changefreq>${changefreq}</changefreq>\n		<priority>${priority}</priority>\n	</url>`
		)
		.join('\n');
	await writeFile(
		path.join(distDirectory, 'sitemap.xml'),
		`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlElements}\n</urlset>\n`,
		'utf8'
	);
}

/* v8 ignore start -- @preserve */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	publishGallerySocialPages(projectRoot)
		.then((count) => {
			console.log(`Published social metadata for ${count} gallery sketch${count === 1 ? '' : 'es'}.`);
		})
		.catch((error) => {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		});
}
/* v8 ignore stop -- @preserve */
