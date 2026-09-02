export function asRecord(value: unknown): Record<string, unknown> | null {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

export function onlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
	return Object.keys(value).every((key) => allowed.includes(key));
}

export function integer(value: unknown, min: number, max: number): value is number {
	return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

export function text(value: unknown, min: number, max: number): value is string {
	return typeof value === 'string' && value.length >= min && value.length <= max;
}

export function aborted(signal: AbortSignal): boolean {
	return signal.aborted;
}

export function cursorBoundary(textValue: string, offset: number): number {
	if (offset > 0 && offset < textValue.length && isLowSurrogate(textValue.charCodeAt(offset))) return offset - 1;
	return offset;
}

function isLowSurrogate(code: number): boolean {
	return code >= 0xdc00 && code <= 0xdfff;
}
