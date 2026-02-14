type ClipboardLike = {
	write?: (items: unknown[]) => Promise<void>;
	writeText?: (text: string) => Promise<void>;
	read?: () => Promise<unknown[]>;
	readText?: () => Promise<string>;
};

interface WindowWithClipboardItem extends Window {
	ClipboardItem?: new (items: Record<string, Blob | Promise<Blob> | string | Promise<string>>) => unknown;
}

class ClipboardItemShim {
	private readonly entries: Record<string, Blob | Promise<Blob> | string | Promise<string>>;

	constructor(entries: Record<string, Blob | Promise<Blob> | string | Promise<string>>) {
		this.entries = entries;
	}

	get types(): string[] {
		return Object.keys(this.entries);
	}

	async getType(type: string): Promise<Blob> {
		const value = await this.entries[type];
		if (value instanceof Blob) {
			return value;
		}
		return new Blob([String(value)], { type });
	}
}

function createClipboardFallback(): ClipboardLike {
	let memoryText = '';
	return {
		write: async () => {
			// no-op fallback for browsers without Clipboard API support
		},
		writeText: async (text: string) => {
			memoryText = text;
		},
		read: async () => [],
		readText: async () => memoryText,
	};
}

function patchClipboardMethods(clipboard: ClipboardLike): void {
	if (typeof clipboard.write !== 'function') {
		clipboard.write = async () => {};
	}
	if (typeof clipboard.writeText !== 'function') {
		clipboard.writeText = async () => {};
	}
	if (typeof clipboard.read !== 'function') {
		clipboard.read = async () => [];
	}
	if (typeof clipboard.readText !== 'function') {
		clipboard.readText = async () => '';
	}
}

function tryAssignClipboard(navigatorRef: Navigator, clipboard: ClipboardLike): boolean {
	try {
		Object.defineProperty(navigatorRef, 'clipboard', {
			configurable: true,
			value: clipboard,
		});
		return true;
	} catch {
		// Ignore and try prototype fallback.
	}

	try {
		const proto = Object.getPrototypeOf(navigatorRef);
		if (!proto) return false;
		Object.defineProperty(proto, 'clipboard', {
			configurable: true,
			get: () => clipboard,
		});
		return true;
	} catch {
		return false;
	}
}

/**
 * Monaco's Safari clipboard workaround assumes `navigator.clipboard.write` and `ClipboardItem`
 * always exist, which is not true on iOS WebKit. This shim prevents runtime crashes on tap/click.
 */
export function ensureMonacoClipboardCompatibility(): void {
	const runtimeWindow = window as WindowWithClipboardItem;
	const runtimeNavigator = runtimeWindow.navigator as Navigator & { clipboard?: ClipboardLike };

	if (typeof runtimeWindow.ClipboardItem !== 'function') {
		runtimeWindow.ClipboardItem = ClipboardItemShim as unknown as WindowWithClipboardItem['ClipboardItem'];
	}

	if (!runtimeNavigator.clipboard) {
		const fallback = createClipboardFallback();
		if (!tryAssignClipboard(runtimeNavigator, fallback)) {
			return;
		}
	}

	if (runtimeNavigator.clipboard) {
		patchClipboardMethods(runtimeNavigator.clipboard);
	}
}
