import { ScrollArea } from '@/shared/ui/scroll-area';
import { Keyboard } from 'lucide-react';
import { SHORTCUT_GROUPS } from '@/platform/input/shortcuts';

export function ShortcutsTab() {
	const usesMacKeys = /Mac|iPhone|iPad|iPod/.test(navigator.platform);

	return (
		<ScrollArea className="h-full">
			<div className="p-6 space-y-6">
				<div className="flex items-center gap-2 mb-6 text-zinc-400">
					<Keyboard className="w-5 h-5" />
					<span className="text-sm font-medium uppercase tracking-wider">Keyboard Shortcuts</span>
				</div>

				<div className="grid gap-6">
					{SHORTCUT_GROUPS.map((group) => (
						<div key={group.title} className="space-y-3">
							<h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-1">
								{group.title}
							</h3>
							<div className="space-y-2">
								{group.shortcuts.map((shortcut) => (
									<div
										key={shortcut.description}
										className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/30 border border-white/5 group hover:bg-zinc-800/50 transition-colors"
									>
										<span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
											{shortcut.description}
										</span>
										<div className="flex items-center gap-1.5">
											{(usesMacKeys ? (shortcut.macKeys ?? shortcut.keys) : shortcut.keys).map(
												(key) => (
													<kbd
														key={key}
														className="px-2 py-1 min-w-[24px] text-center rounded bg-zinc-800 border-b-2 border-zinc-700 text-zinc-400 font-mono text-[10px] font-bold shadow-sm"
													>
														{key}
													</kbd>
												)
											)}
										</div>
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			</div>
		</ScrollArea>
	);
}
