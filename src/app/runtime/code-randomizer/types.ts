export type RandomSource = () => number;

export type NumericKind = 'integer' | 'unsignedInteger' | 'float';

export interface NumericMutationTarget {
	kind: 'number';
	language: 'javascript' | 'glsl';
	numericKind: NumericKind;
	start: number;
	end: number;
	text: string;
	value: number;
}

export interface BlendModeMutationTarget {
	kind: 'blendMode';
	language: 'javascript';
	start: number;
	end: number;
	text: string;
}

export interface HexColorMutationTarget {
	kind: 'hexColor';
	language: 'javascript';
	start: number;
	end: number;
	text: string;
}

export type MutationTarget = NumericMutationTarget | BlendModeMutationTarget | HexColorMutationTarget;

export interface GlslTemplateSource {
	start: number;
	text: string;
}

export interface JavaScriptTargetCollection {
	targets: MutationTarget[];
	glslTemplates: GlslTemplateSource[];
}
