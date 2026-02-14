export function parseAllowedParentOrigins(raw: unknown, isDev: boolean): string[] {
	if (!raw || typeof raw !== 'string') {
		return isDev ? ['*'] : [];
	}

	const parsed = raw
		.split(',')
		.map((value) => value.trim())
		.filter((value) => value.length > 0);

	if (parsed.length > 0) return parsed;
	return isDev ? ['*'] : [];
}

export function getFirstAllowedParentOrigin(origins: string[]): string | null {
	return origins[0] ?? null;
}
