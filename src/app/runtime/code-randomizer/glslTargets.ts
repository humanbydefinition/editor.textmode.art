import parse from '@shaderfrog/glsl-parser/parser/index.js';
import {
	visit,
	type FloatConstantNode,
	type IntConstantNode,
	type Path,
	type UintConstantNode,
} from '@shaderfrog/glsl-parser/ast/index.js';
import type { GlslTemplateSource, NumericKind, NumericMutationTarget } from './types';

const PROTECTED_ANCESTORS = new Set(['array_specifier', 'quantifier', 'layout_qualifier_id']);

type GlslNumericNode = IntConstantNode | UintConstantNode | FloatConstantNode;

export function collectGlslTargets(template: GlslTemplateSource): NumericMutationTarget[] {
	const program = parse(template.text, {
		includeLocation: true,
		quiet: true,
		stage: 'either',
	});
	const targets: NumericMutationTarget[] = [];
	const collect = (path: Path<GlslNumericNode>) => {
		if (hasProtectedAncestor(path)) return;
		const target = createNumericTarget(template, path);
		if (target) targets.push(target);
	};

	visit(program, {
		int_constant: { enter: collect },
		uint_constant: { enter: collect },
		float_constant: { enter: collect },
	});

	return targets;
}

function hasProtectedAncestor(path: Path<GlslNumericNode>): boolean {
	let child: Path<unknown> = path;
	let parent = path.parentPath;
	while (parent) {
		const node = parent.node;
		if (isTypedNode(node) && PROTECTED_ANCESTORS.has(node.type)) return true;
		if (isTypedNode(node) && node.type === 'switch_case' && child.key === 'test') return true;
		child = parent;
		parent = parent.parentPath;
	}
	return false;
}

function createNumericTarget(template: GlslTemplateSource, path: Path<GlslNumericNode>): NumericMutationTarget | null {
	const location = path.node.location;
	if (!location) return null;

	const unaryParent = isNegativeUnary(path);
	const parentLocation = unaryParent && isTypedNode(unaryParent.node) ? unaryParent.node.location : undefined;
	const localStart = parentLocation?.start.offset ?? location.start.offset;
	const localEnd = location.end.offset;
	const start = template.start + localStart;
	const end = template.start + localEnd;
	const numericKind = nodeKind(path.node);
	const unsignedToken = numericKind === 'unsignedInteger' ? path.node.token.replace(/[uU]$/, '') : path.node.token;
	const parsedValue = numericKind === 'float' ? Number.parseFloat(unsignedToken) : parseInteger(unsignedToken);
	if (!Number.isFinite(parsedValue)) return null;
	const value = parsedValue * (unaryParent ? -1 : 1);

	return {
		kind: 'number',
		language: 'glsl',
		numericKind,
		start,
		end,
		text: template.text.slice(localStart, localEnd),
		value,
	};
}

function parseInteger(token: string): number {
	if (/^0[xX]/.test(token)) return Number.parseInt(token.slice(2), 16);
	if (/^0[bB]/.test(token)) return Number.parseInt(token.slice(2), 2);
	if (/^0[oO]/.test(token)) return Number.parseInt(token.slice(2), 8);
	return Number.parseInt(token, 10);
}

function nodeKind(node: GlslNumericNode): NumericKind {
	if (node.type === 'float_constant') return 'float';
	if (node.type === 'uint_constant' || /[uU]$/.test(node.token)) return 'unsignedInteger';
	return 'integer';
}

function isNegativeUnary(path: Path<GlslNumericNode>): Path<unknown> | undefined {
	const parent = path.parentPath;
	if (!parent || !isTypedNode(parent.node) || parent.node.type !== 'unary') return undefined;
	const unary = parent.node as { operator?: { literal?: string }; expression?: unknown };
	return unary.operator?.literal === '-' && unary.expression === path.node ? parent : undefined;
}

function isTypedNode(node: unknown): node is { type: string; location?: GlslNumericNode['location'] } {
	return typeof node === 'object' && node !== null && 'type' in node && typeof node.type === 'string';
}
