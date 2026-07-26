import ts from 'typescript';

const JSDOC_LINK_PATTERN = /\{@(link|linkplain|linkcode)\s+([^{}\n]+?)\}/g;
const DISALLOWED_NAME_PATTERN = /^[$_]/;

type JSDocLinkTag = 'link' | 'linkplain' | 'linkcode';

interface TextRange {
	start: number;
	end: number;
}

interface TextEdit extends TextRange {
	replacement: string;
}

interface ParsedJSDocLink {
	target: string;
	label?: string;
}

export interface DeclarationTransformResult {
	content: string;
	removedDeclarationCount: number;
	removedExampleCount: number;
	normalizedLinkCount: number;
}

export function transformDeclaration(fileName: string, sourceText: string): DeclarationTransformResult {
	const normalizedSource = sourceText.replace(/\r\n?/g, '\n');
	const sourceFile = parseDeclaration(fileName, normalizedSource, 'source');
	const declarationRanges: TextRange[] = [];
	const exampleRanges: TextRange[] = [];
	const linkEdits: TextEdit[] = [];

	visitSyntaxNodes(sourceFile, (node) => {
		if (isDisallowedDeclaration(node)) {
			declarationRanges.push(getCompleteDeclarationRange(sourceFile, normalizedSource, node));
		}

		for (const jsDoc of getJSDocNodes(node)) {
			for (const tag of jsDoc.tags ?? []) {
				if (tag.tagName.text === 'example') {
					exampleRanges.push({ start: tag.pos, end: tag.end });
				}
			}

			const comment = normalizedSource.slice(jsDoc.pos, jsDoc.end);
			for (const match of comment.matchAll(JSDOC_LINK_PATTERN)) {
				const matchIndex = match.index;
				if (matchIndex === undefined) continue;
				linkEdits.push({
					start: jsDoc.pos + matchIndex,
					end: jsDoc.pos + matchIndex + match[0].length,
					replacement: renderNormalizedJSDocLink(parseJSDocLink(match[2]), match[1] as JSDocLinkTag),
				});
			}
		}
	});

	const seeEdits = collectDuplicateAccessorSeeEdits(sourceFile, normalizedSource);

	const mergedDeclarationRanges = mergeRanges(declarationRanges);
	const mergedExampleRanges = mergeRanges(
		exampleRanges.filter(
			(range) => !mergedDeclarationRanges.some((declaration) => rangesOverlap(range, declaration))
		)
	);
	const mergedSeeEdits = mergeRanges(seeEdits);
	const applicableLinkEdits = linkEdits.filter(
		(edit) =>
			!mergedDeclarationRanges.some((range) => rangesOverlap(edit, range)) &&
			!mergedExampleRanges.some((range) => rangesOverlap(edit, range)) &&
			!mergedSeeEdits.some((range) => rangesOverlap(edit, range))
	);
	const edits: TextEdit[] = [
		...mergedDeclarationRanges.map((range) => ({ ...range, replacement: '' })),
		...mergedExampleRanges.map((range) => ({ ...range, replacement: '' })),
		...mergedSeeEdits.map((range) => ({ ...range, replacement: '' })),
		...applicableLinkEdits,
	];

	const content = applyEdits(normalizedSource, edits).trim();
	parseDeclaration(fileName, content, 'transformed output');

	return {
		content,
		removedDeclarationCount: declarationRanges.length,
		removedExampleCount: exampleRanges.length,
		normalizedLinkCount: applicableLinkEdits.length,
	};
}

function parseDeclaration(fileName: string, content: string, stage: string): ts.SourceFile {
	const sourceFile = ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	const parseDiagnostics = (sourceFile as ts.SourceFile & { parseDiagnostics: readonly ts.DiagnosticWithLocation[] })
		.parseDiagnostics;
	if (parseDiagnostics.length === 0) return sourceFile;

	const diagnostic = parseDiagnostics[0];
	const position =
		diagnostic.start === undefined ? undefined : sourceFile.getLineAndCharacterOfPosition(diagnostic.start);
	const location = position ? `:${position.line + 1}:${position.character + 1}` : '';
	throw new Error(
		`Invalid declaration ${stage} in ${fileName}${location}: ${ts.flattenDiagnosticMessageText(
			diagnostic.messageText,
			'\n'
		)}`
	);
}

function visitSyntaxNodes(node: ts.Node, visitor: (node: ts.Node) => void): void {
	visitor(node);
	ts.forEachChild(node, (child) => visitSyntaxNodes(child, visitor));
}

function getJSDocNodes(node: ts.Node): readonly ts.JSDoc[] {
	return (node as ts.Node & { jsDoc?: ts.NodeArray<ts.JSDoc> }).jsDoc ?? [];
}

function getSeeTags(node: ts.Node): readonly ts.JSDocTag[] {
	const tags: ts.JSDocTag[] = [];
	for (const jsDoc of getJSDocNodes(node)) {
		for (const tag of jsDoc.tags ?? []) {
			if (tag.tagName.text === 'see') {
				tags.push(tag);
			}
		}
	}
	return tags;
}

function collectDuplicateAccessorSeeEdits(sourceFile: ts.SourceFile, source: string): TextEdit[] {
	const edits: TextEdit[] = [];

	visitSyntaxNodes(sourceFile, (node) => {
		if (!ts.isClassDeclaration(node) && !ts.isInterfaceDeclaration(node)) {
			return;
		}

		const getAccessors = new Map<string, { seeTags: readonly ts.JSDocTag[] }>();
		const setAccessors = new Map<string, { seeTags: readonly ts.JSDocTag[] }>();

		for (const member of node.members) {
			const name = member.name?.getText();
			if (!name) continue;

			if (ts.isGetAccessorDeclaration(member)) {
				const seeTags = getSeeTags(member);
				if (seeTags.length > 0) {
					getAccessors.set(name, { seeTags });
				}
			} else if (ts.isSetAccessorDeclaration(member)) {
				const seeTags = getSeeTags(member);
				if (seeTags.length > 0) {
					setAccessors.set(name, { seeTags });
				}
			}
		}

		for (const [name, getter] of getAccessors) {
			const setter = setAccessors.get(name);
			if (!setter) continue;

			for (const setterTag of setter.seeTags) {
				const tagText = source.slice(setterTag.pos, setterTag.end);
				const isDuplicate = getter.seeTags.some(
					(getterTag) => source.slice(getterTag.pos, getterTag.end) === tagText
				);
				if (isDuplicate) {
					edits.push({
						start: setterTag.pos,
						end: setterTag.end,
						replacement: '',
					});
				}
			}
		}
	});

	return edits;
}

function isDisallowedDeclaration(node: ts.Node): node is ts.NamedDeclaration {
	if (
		!ts.isFunctionDeclaration(node) &&
		!ts.isMethodDeclaration(node) &&
		!ts.isMethodSignature(node) &&
		!ts.isPropertyDeclaration(node) &&
		!ts.isPropertySignature(node) &&
		!ts.isGetAccessorDeclaration(node) &&
		!ts.isSetAccessorDeclaration(node)
	) {
		return false;
	}

	const name = node.name;
	if (!name || (!ts.isIdentifier(name) && !ts.isStringLiteral(name))) return false;
	return DISALLOWED_NAME_PATTERN.test(name.text);
}

function getCompleteDeclarationRange(sourceFile: ts.SourceFile, source: string, node: ts.Node): TextRange {
	let start = node.getStart(sourceFile, true);
	const lineStart = source.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
	if (/^[\t ]*$/.test(source.slice(lineStart, start))) start = lineStart;

	let end = node.end;
	while (end < source.length && (source[end] === ' ' || source[end] === '\t')) end++;
	if (source[end] === '\n') end++;

	return { start, end };
}

function mergeRanges(ranges: readonly TextRange[]): TextRange[] {
	if (ranges.length === 0) return [];
	const sorted = [...ranges].sort((left, right) => left.start - right.start || right.end - left.end);
	const merged: TextRange[] = [{ ...sorted[0] }];

	for (const range of sorted.slice(1)) {
		const previous = merged[merged.length - 1];
		if (range.start <= previous.end) {
			previous.end = Math.max(previous.end, range.end);
		} else {
			merged.push({ ...range });
		}
	}

	return merged;
}

function rangesOverlap(left: TextRange, right: TextRange): boolean {
	return left.start < right.end && right.start < left.end;
}

function applyEdits(source: string, edits: readonly TextEdit[]): string {
	const sorted = [...edits].sort((left, right) => right.start - left.start || right.end - left.end);
	let result = source;
	let previousStart = source.length;

	for (const edit of sorted) {
		if (edit.end > previousStart) {
			throw new Error('Declaration transformation produced overlapping edits.');
		}
		result = result.slice(0, edit.start) + edit.replacement + result.slice(edit.end);
		previousStart = edit.start;
	}

	return result;
}

function parseJSDocLink(rawBody: string): ParsedJSDocLink {
	const trimmed = rawBody.trim();
	const pipeIndex = trimmed.indexOf('|');

	if (pipeIndex !== -1) {
		const target = trimmed.slice(0, pipeIndex).trim();
		const label = trimmed.slice(pipeIndex + 1).trim();
		return { target, label: label.length > 0 ? label : undefined };
	}

	const externalWithLabelMatch = trimmed.match(/^(https?:\/\/\S+)\s+(.+)$/i);
	if (externalWithLabelMatch) {
		return { target: externalWithLabelMatch[1], label: externalWithLabelMatch[2].trim() };
	}

	return { target: trimmed };
}

function renderNormalizedJSDocLink(link: ParsedJSDocLink, tagName: JSDocLinkTag): string {
	const displayText = link.label ?? link.target;
	if (isExternalLinkTarget(link.target)) {
		return `[${escapeMarkdownLinkText(displayText)}](${link.target})`;
	}
	if (tagName === 'linkplain') return displayText;
	return renderMarkdownCodeSpan(displayText);
}

function isExternalLinkTarget(target: string): boolean {
	return /^[a-z][a-z0-9+.-]*:\/\//i.test(target);
}

function escapeMarkdownLinkText(text: string): string {
	return text.replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

function renderMarkdownCodeSpan(text: string): string {
	if (!text.includes('`')) return `\`${text}\``;
	return `\`\` ${text.replace(/\r?\n/g, ' ')} \`\``;
}
