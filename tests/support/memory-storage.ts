export function createMemoryStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'clear'> {
	const values = new Map<string, string>();
	return {
		getItem: (key) => values.get(key) ?? null,
		setItem: (key, value) => values.set(key, value),
		removeItem: (key) => values.delete(key),
		clear: () => values.clear(),
	};
}
