export interface ShortcutActions {
	changeFontSize: (delta: number) => void;
	hardReset: () => void;
	toggleAutoExecute: () => void;
	toggleEditorBackdrop: () => void;
	toggleUIVisibility: () => void;
}

export interface ShortcutDefinition {
	id: string;
	group: string;
	keys: string[];
	macKeys?: string[];
	description: string;
}

interface AppShortcutDefinition extends ShortcutDefinition {
	matches: (event: KeyboardEvent) => boolean;
	run: (actions: ShortcutActions) => void;
	stopPropagation?: boolean;
}

export const APP_SHORTCUTS = [
	{
		id: 'reset-runtime',
		group: 'Editor Control',
		keys: ['Ctrl', 'Shift', 'R'],
		description: 'reset sketch runtime',
		matches: (event) =>
			event.code === 'KeyR' &&
			event.ctrlKey &&
			event.shiftKey &&
			!event.altKey &&
			!event.metaKey &&
			!event.repeat,
		run: (actions) => actions.hardReset(),
		stopPropagation: true,
	},
	{
		id: 'increase-font-size',
		group: 'Appearance',
		keys: ['Ctrl', 'Shift', '+'],
		description: 'increase font size',
		matches: (event) => event.ctrlKey && event.shiftKey && (event.key === '+' || event.key === '='),
		run: (actions) => actions.changeFontSize(1),
	},
	{
		id: 'decrease-font-size',
		group: 'Appearance',
		keys: ['Ctrl', 'Shift', '-'],
		description: 'decrease font size',
		matches: (event) => event.ctrlKey && event.shiftKey && (event.key === '_' || event.key === '-'),
		run: (actions) => actions.changeFontSize(-1),
	},
	{
		id: 'toggle-text-background',
		group: 'Appearance',
		keys: ['Ctrl', 'B'],
		description: 'toggle text background',
		matches: (event) => event.ctrlKey && event.key === 'b',
		run: (actions) => actions.toggleEditorBackdrop(),
	},
	{
		id: 'toggle-ui',
		group: 'Appearance',
		keys: ['Ctrl', 'Shift', 'H'],
		description: 'hide / show ui',
		matches: (event) => event.ctrlKey && event.shiftKey && event.key === 'H',
		run: (actions) => actions.toggleUIVisibility(),
	},
	{
		id: 'toggle-auto-execute',
		group: 'Settings',
		keys: ['Ctrl', 'E'],
		description: 'toggle auto-execute',
		matches: (event) => event.ctrlKey && event.key === 'e',
		run: (actions) => actions.toggleAutoExecute(),
	},
] satisfies AppShortcutDefinition[];

export const MONACO_SHORTCUTS = [
	{
		id: 'run-code',
		group: 'Editor Control',
		keys: ['Ctrl', 'Enter'],
		macKeys: ['Cmd', 'Enter'],
		description: 'run code / apply changes',
	},
	{ id: 'find', group: 'Navigation & Editing', keys: ['Ctrl', 'F'], macKeys: ['Cmd', 'F'], description: 'open find' },
	{
		id: 'replace',
		group: 'Navigation & Editing',
		keys: ['Ctrl', 'H'],
		macKeys: ['Option', 'Cmd', 'F'],
		description: 'open replace',
	},
	{ id: 'close-find', group: 'Navigation & Editing', keys: ['Esc'], description: 'close find / replace' },
	{ id: 'undo', group: 'Navigation & Editing', keys: ['Ctrl', 'Z'], macKeys: ['Cmd', 'Z'], description: 'undo' },
	{
		id: 'redo',
		group: 'Navigation & Editing',
		keys: ['Ctrl', 'Y'],
		macKeys: ['Cmd', 'Shift', 'Z'],
		description: 'redo',
	},
	{
		id: 'toggle-comment',
		group: 'Navigation & Editing',
		keys: ['Ctrl', '/'],
		macKeys: ['Cmd', '/'],
		description: 'toggle comment',
	},
	{
		id: 'multi-cursor',
		group: 'Navigation & Editing',
		keys: ['Alt', 'Click'],
		macKeys: ['Option', 'Click'],
		description: 'add multi-cursor',
	},
	{ id: 'command-palette', group: 'Navigation & Editing', keys: ['F1'], description: 'open command palette' },
] satisfies ShortcutDefinition[];

const ALL_SHORTCUTS = [...MONACO_SHORTCUTS, ...APP_SHORTCUTS];
const GROUP_ORDER = ['Editor Control', 'Appearance', 'Navigation & Editing', 'Settings'];

export const SHORTCUT_GROUPS: Array<{ title: string; shortcuts: ShortcutDefinition[] }> = GROUP_ORDER.map((title) => ({
	title,
	shortcuts: ALL_SHORTCUTS.filter((shortcut) => shortcut.group === title),
}));

export function getShortcut(id: string): ShortcutDefinition {
	const shortcut = ALL_SHORTCUTS.find((candidate) => candidate.id === id);
	if (!shortcut) throw new Error(`Unknown shortcut: ${id}`);
	return shortcut;
}

export function installShortcuts(actions: ShortcutActions): () => void {
	const handleKeydown = (event: KeyboardEvent) => {
		const shortcut = APP_SHORTCUTS.find((candidate) => candidate.matches(event));
		if (!shortcut) return;

		event.preventDefault();
		if (shortcut.stopPropagation) event.stopPropagation();
		shortcut.run(actions);
	};

	window.addEventListener('keydown', handleKeydown, true);
	return () => window.removeEventListener('keydown', handleKeydown, true);
}
