import {
	parse,
	type AnyNode,
	type CallExpression,
	type Identifier,
	type Literal,
	type MemberExpression,
	type Property,
	type TemplateLiteral,
	type UnaryExpression,
} from 'acorn';
import type {
	BlendModeMutationTarget,
	GlslTemplateSource,
	HexColorMutationTarget,
	JavaScriptTargetCollection,
	MutationTarget,
	NumericMutationTarget,
} from './types';

const GLSL_HEADER = /^\s*#version\s+\d+\s+es\b/;
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function collectJavaScriptTargets(code: string, blendModes: ReadonlySet<string>): JavaScriptTargetCollection {
	const program = parse(code, {
		ecmaVersion: 'latest',
		sourceType: 'script',
		allowAwaitOutsideFunction: true,
		allowReturnOutsideFunction: true,
	});
	const targets: MutationTarget[] = [];
	const glslTemplates: GlslTemplateSource[] = [];

	walk(program, undefined, (node, parent) => {
		if (node.type === 'Literal') {
			const literal = node as Literal;
			if (typeof literal.value === 'number' && Number.isFinite(literal.value)) {
				targets.push(createNumericTarget(code, literal, parent));
			} else if (typeof literal.value === 'string') {
				const target = createQuotedHexColorTarget(code, literal);
				if (target) targets.push(target);
			}
			return;
		}

		if (node.type === 'TemplateLiteral') {
			const template = node as TemplateLiteral;
			if (template.expressions.length !== 0) return;

			const text = code.slice(template.start + 1, template.end - 1);
			if (GLSL_HEADER.test(text)) {
				glslTemplates.push({ start: template.start + 1, text });
				return;
			}

			const value = template.quasis[0]?.value.cooked;
			const target =
				typeof value === 'string' ? createHexColorTarget(value, template.start + 1, template.end - 1) : null;
			if (target) targets.push(target);
			return;
		}

		if (node.type === 'Property') {
			const target = collectBlendModeProperty(code, node as Property, blendModes);
			if (target) targets.push(target);
			return;
		}

		if (node.type === 'CallExpression') {
			const target = collectBlendModeCall(code, node as CallExpression, blendModes);
			if (target) targets.push(target);
		}
	});

	return { targets, glslTemplates };
}

function createQuotedHexColorTarget(code: string, literal: Literal): HexColorMutationTarget | null {
	const quote = code[literal.start];
	if ((quote !== "'" && quote !== '"') || code[literal.end - 1] !== quote) return null;
	return createHexColorTarget(literal.value as string, literal.start + 1, literal.end - 1);
}

function createHexColorTarget(value: string, start: number, end: number): HexColorMutationTarget | null {
	if (!HEX_COLOR.test(value)) return null;
	return {
		kind: 'hexColor',
		language: 'javascript',
		start,
		end,
		text: value,
	};
}

function createNumericTarget(code: string, literal: Literal, parent: AnyNode | undefined): NumericMutationTarget {
	const raw = code.slice(literal.start, literal.end);
	const normalizedRaw = raw.replaceAll('_', '');
	const isNegative = isNegativeLiteral(parent, literal);
	const start = isNegative ? parent.start : literal.start;
	const end = literal.end;
	const text = code.slice(start, end);
	const value = (literal.value as number) * (isNegative ? -1 : 1);

	return {
		kind: 'number',
		language: 'javascript',
		numericKind:
			normalizedRaw.includes('.') || (!/^0[xXbBoO]/.test(normalizedRaw) && /[eE]/.test(normalizedRaw))
				? 'float'
				: 'integer',
		start,
		end,
		text,
		value,
	};
}

function isNegativeLiteral(parent: AnyNode | undefined, literal: Literal): parent is UnaryExpression {
	return (
		parent?.type === 'UnaryExpression' &&
		(parent as UnaryExpression).operator === '-' &&
		parent.argument === literal
	);
}

function collectBlendModeProperty(
	code: string,
	property: Property,
	blendModes: ReadonlySet<string>
): BlendModeMutationTarget | null {
	if (property.kind !== 'init' || staticPropertyName(property.key, property.computed) !== 'blendMode') return null;
	return createBlendModeTarget(code, property.value, blendModes);
}

function collectBlendModeCall(
	code: string,
	call: CallExpression,
	blendModes: ReadonlySet<string>
): BlendModeMutationTarget | null {
	if (call.callee.type !== 'MemberExpression') return null;
	const member = call.callee as MemberExpression;
	if (staticPropertyName(member.property, member.computed) !== 'blendMode') return null;
	return createBlendModeTarget(code, call.arguments[0], blendModes);
}

function createBlendModeTarget(
	code: string,
	node: AnyNode | undefined,
	blendModes: ReadonlySet<string>
): BlendModeMutationTarget | null {
	if (node?.type !== 'Literal') return null;
	const literal = node as Literal;
	if (typeof literal.value !== 'string' || !blendModes.has(literal.value)) return null;

	const quote = code[literal.start];
	if ((quote !== "'" && quote !== '"') || code[literal.end - 1] !== quote) return null;

	return {
		kind: 'blendMode',
		language: 'javascript',
		start: literal.start + 1,
		end: literal.end - 1,
		text: literal.value,
	};
}

function staticPropertyName(node: AnyNode, computed: boolean): string | null {
	if (!computed && node.type === 'Identifier') return (node as Identifier).name;
	if (node.type === 'Literal' && typeof (node as Literal).value === 'string') {
		return (node as Literal).value as string;
	}
	return null;
}

function walk(node: AnyNode, parent: AnyNode | undefined, visit: (node: AnyNode, parent?: AnyNode) => void): void {
	visit(node, parent);
	for (const value of Object.values(node)) {
		if (Array.isArray(value)) {
			for (const child of value) {
				if (isNode(child)) walk(child, node, visit);
			}
		} else if (isNode(value)) {
			walk(value, node, visit);
		}
	}
}

function isNode(value: unknown): value is AnyNode {
	return typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string';
}
