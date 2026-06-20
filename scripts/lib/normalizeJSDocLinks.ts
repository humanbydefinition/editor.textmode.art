const JSDOC_LINK_PATTERN = /\{@(link|linkplain|linkcode)\s+([^{}\n]+?)\}/g;

type JSDocLinkTag = 'link' | 'linkplain' | 'linkcode';

type ParsedJSDocLink = {
	target: string;
	label?: string;
};

export function normalizeJSDocLinks(content: string): string {
	return content.replace(JSDOC_LINK_PATTERN, (_match, tagName: JSDocLinkTag, rawBody: string) =>
		renderNormalizedJSDocLink(parseJSDocLink(rawBody), tagName)
	);
}

function parseJSDocLink(rawBody: string): ParsedJSDocLink {
	const trimmed = rawBody.trim();
	const pipeIndex = trimmed.indexOf('|');

	if (pipeIndex !== -1) {
		const target = trimmed.slice(0, pipeIndex).trim();
		const label = trimmed.slice(pipeIndex + 1).trim();

		return {
			target,
			label: label.length > 0 ? label : undefined,
		};
	}

	const externalWithLabelMatch = trimmed.match(/^(https?:\/\/\S+)\s+(.+)$/i);
	if (externalWithLabelMatch) {
		return {
			target: externalWithLabelMatch[1],
			label: externalWithLabelMatch[2].trim(),
		};
	}

	return { target: trimmed };
}

function renderNormalizedJSDocLink(link: ParsedJSDocLink, tagName: JSDocLinkTag): string {
	const displayText = link.label ?? link.target;

	if (isExternalLinkTarget(link.target)) {
		return `[${escapeMarkdownLinkText(displayText)}](${link.target})`;
	}

	if (tagName === 'linkplain') {
		return displayText;
	}

	return renderMarkdownCodeSpan(displayText);
}

function isExternalLinkTarget(target: string): boolean {
	return /^[a-z][a-z0-9+.-]*:\/\//i.test(target);
}

function escapeMarkdownLinkText(text: string): string {
	return text.replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

function renderMarkdownCodeSpan(text: string): string {
	if (!text.includes('`')) {
		return `\`${text}\``;
	}

	return `\`\` ${text.replace(/\r?\n/g, ' ')} \`\``;
}
