import { RotateCcw, Trash2, Zap, ZapOff, Type, Monitor, ListOrdered } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Switch } from '@/shared/ui/switch';
import { Slider } from '@/shared/ui/slider';
import { Label } from '@/shared/ui/label';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Separator } from '@/shared/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import type { AppSettings } from '@/types';

interface PreferencesTabProps {
	settings: AppSettings;
	onSettingsChange: (settings: Partial<AppSettings>) => void;
	onResetRunners: () => void;
	onClearStorage: () => void;
	onClose: () => void;
}

export function PreferencesTab({
	settings,
	onSettingsChange,
	onResetRunners,
	onClearStorage,
	onClose,
}: PreferencesTabProps) {
	const togglePreferences = [
		{
			id: 'auto-execute',
			label: 'auto execute',
			description: 'run code automatically on changes',
			icon: settings.autoExecute ? Zap : ZapOff,
			iconClassName: 'bg-blue-500/10 text-blue-400',
			checked: settings.autoExecute,
			onCheckedChange: (checked: boolean) => onSettingsChange({ autoExecute: checked }),
		},
		{
			id: 'editor-backdrop',
			label: 'text background',
			description: 'dark backdrop behind code text',
			icon: Type,
			iconClassName: 'bg-zinc-800 text-zinc-400',
			checked: settings.editorBackdrop,
			onCheckedChange: (checked: boolean) => onSettingsChange({ editorBackdrop: checked }),
		},
		{
			id: 'line-numbers',
			label: 'line numbers',
			description: 'show line numbers in editor',
			icon: ListOrdered,
			iconClassName: 'bg-indigo-500/10 text-indigo-400',
			checked: settings.lineNumbers,
			onCheckedChange: (checked: boolean) => onSettingsChange({ lineNumbers: checked }),
		},
	];

	return (
		<ScrollArea className="h-full">
			<div className="p-6 space-y-6">
				<div className="space-y-4">
					<h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Preferences</h3>

					{togglePreferences.slice(0, 1).map((preference) => {
						const Icon = preference.icon;
						return (
							<div
								key={preference.id}
								className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/30 border border-white/5"
							>
								<div className="flex items-center gap-4">
									<div
										className={`flex items-center justify-center w-8 h-8 rounded-lg ${preference.iconClassName}`}
									>
										<Icon className="w-4 h-4" />
									</div>
									<div>
										<Label
											htmlFor={preference.id}
											className="text-sm font-medium text-white cursor-pointer block"
										>
											{preference.label}
										</Label>
										<p className="text-xs text-zinc-500">{preference.description}</p>
									</div>
								</div>
								<Switch
									id={preference.id}
									checked={preference.checked}
									onCheckedChange={preference.onCheckedChange}
								/>
							</div>
						);
					})}

					{/* Auto Execute Delay (only visible when auto-execute is on) */}
					{settings.autoExecute && (
						<div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/30 border border-white/5 ml-8 border-l-2 border-l-blue-500/20">
							<div className="flex items-center gap-4 flex-1">
								<div>
									<Label className="text-sm font-medium text-white block">debounce delay</Label>
									<p className="text-xs text-zinc-500">
										wait {settings.autoExecuteDelay}ms before running
									</p>
								</div>
							</div>
							<div className="flex items-center gap-3 w-40">
								<span className="text-xs text-zinc-500 font-mono">100ms</span>
								<Slider
									value={[settings.autoExecuteDelay ?? 500]}
									min={100}
									max={2000}
									step={100}
									onValueChange={(values) => onSettingsChange({ autoExecuteDelay: values[0] })}
								/>
								<span className="text-xs text-zinc-500 font-mono">2s</span>
							</div>
						</div>
					)}

					{togglePreferences.slice(1).map((preference) => {
						const Icon = preference.icon;
						return (
							<div
								key={preference.id}
								className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/30 border border-white/5"
							>
								<div className="flex items-center gap-4">
									<div
										className={`flex items-center justify-center w-8 h-8 rounded-lg ${preference.iconClassName}`}
									>
										<Icon className="w-4 h-4" />
									</div>
									<div>
										<Label
											htmlFor={preference.id}
											className="text-sm font-medium text-white cursor-pointer block"
										>
											{preference.label}
										</Label>
										<p className="text-xs text-zinc-500">{preference.description}</p>
									</div>
								</div>
								<Switch
									id={preference.id}
									checked={preference.checked}
									onCheckedChange={preference.onCheckedChange}
								/>
							</div>
						);
					})}

					{/* Font Size Control */}
					<div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/30 border border-white/5">
						<div className="flex items-center gap-4">
							<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400">
								<Monitor className="w-4 h-4" />
							</div>
							<div>
								<Label htmlFor="font-size" className="text-sm font-medium text-white block">
									font size
								</Label>
								<p className="text-xs text-zinc-500">editor text size ({settings.fontSize}px)</p>
							</div>
						</div>
						<div className="flex items-center gap-3 w-40">
							<span className="text-xs text-zinc-500 font-mono">10</span>
							<Slider
								value={[settings.fontSize]}
								min={10}
								max={32}
								step={1}
								onValueChange={(values) => onSettingsChange({ fontSize: values[0] })}
							/>
							<span className="text-xs text-zinc-500 font-mono">32</span>
						</div>
					</div>
				</div>

				<Separator className="bg-white/5" />

				<div className="space-y-4">
					<h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">reset</h3>
					<div className="flex gap-3">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="secondary"
									className="flex-1 justify-center gap-2 bg-zinc-900/50 border-white/10 hover:bg-zinc-800/60 text-zinc-200"
									onClick={() => {
										onResetRunners();
										onClose();
									}}
								>
									<RotateCcw className="w-4 h-4" />
									reload sandbox
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>reload the iframe; Safari may require canvas interaction again</p>
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="destructive"
									className="flex-1 justify-center gap-2 bg-red-950/30 border-red-900/50 hover:bg-red-900/50 text-red-400"
									onClick={() => {
										onClearStorage();
										onClose();
									}}
								>
									<Trash2 className="w-4 h-4" />
									reset code
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>reset to the default sketch without reloading the iframe</p>
							</TooltipContent>
						</Tooltip>
					</div>
				</div>
			</div>
		</ScrollArea>
	);
}
