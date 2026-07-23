import { useEffect } from 'react';
import { CheckCircle2, Loader2, Mic2, RefreshCw, Volume2, XCircle } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import type { AudioInputState, AudioInputStatus } from '@/platform/state/slices/audioSlice';

export interface AudioTabProps {
	audioInput: AudioInputState;
	onEnable: (deviceId?: string) => Promise<void>;
	onDisable: () => void;
	onRefreshDevices: () => Promise<void>;
	onSelectDevice: (deviceId: string) => Promise<void>;
}

const DEFAULT_INPUT_VALUE = '__textmode_default_audio_input__';

const STATUS: Record<
	AudioInputStatus,
	{ label: string; text: string; tone: 'neutral' | 'success' | 'warning' | 'danger' }
> = {
	idle: { label: 'ready', text: 'Enable input to feed sketches.', tone: 'neutral' },
	checking: { label: 'checking', text: 'Checking available inputs.', tone: 'neutral' },
	'needs-permission': { label: 'permission', text: 'Enable input to grant microphone access.', tone: 'warning' },
	requesting: { label: 'requesting', text: 'Waiting for browser permission.', tone: 'neutral' },
	active: { label: 'active', text: 'Analysis frames are feeding sketches.', tone: 'success' },
	'no-device': { label: 'no device', text: 'No audio input device found.', tone: 'warning' },
	'permission-denied': { label: 'blocked', text: 'Microphone permission is blocked.', tone: 'danger' },
	unavailable: { label: 'unavailable', text: 'Browser audio input is unavailable.', tone: 'danger' },
	error: { label: 'stopped', text: 'Audio input is stopped.', tone: 'danger' },
};

const TONE_CLASSES = {
	neutral: {
		icon: 'bg-cyan-500/10 text-cyan-300',
		badge: 'bg-zinc-800 text-zinc-300',
	},
	success: {
		icon: 'bg-lime-500/10 text-lime-300',
		badge: 'bg-lime-500/10 text-lime-300',
	},
	warning: {
		icon: 'bg-amber-500/10 text-amber-300',
		badge: 'bg-amber-500/10 text-amber-300',
	},
	danger: {
		icon: 'bg-red-500/10 text-red-300',
		badge: 'bg-red-500/10 text-red-300',
	},
} as const;

export function AudioTab({ audioInput, onEnable, onDisable, onRefreshDevices, onSelectDevice }: AudioTabProps) {
	useEffect(() => {
		void onRefreshDevices();
	}, [onRefreshDevices]);

	const isActive = audioInput.status === 'active';
	const isRequesting = audioInput.status === 'requesting';
	const isUnavailable = audioInput.status === 'unavailable';
	const status = STATUS[audioInput.status];
	const tone = TONE_CLASSES[status.tone];
	const levelPercent = Math.round(Math.min(1, audioInput.level) * 100);
	const selectedLabel = getSelectedDeviceLabel(audioInput);

	return (
		<ScrollArea className="h-full">
			<div className="p-6 space-y-4">
				<h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Audio Input</h3>

				<section className="p-3 rounded-lg bg-zinc-900/30 border border-white/5">
					<div className="flex items-start justify-between gap-3">
						<div className="flex min-w-0 items-start gap-3">
							<div
								className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone.icon}`}
							>
								{getStatusIcon(audioInput.status)}
							</div>
							<div className="min-w-0">
								<div className="flex flex-wrap items-center gap-2">
									<p className="text-sm font-medium text-white">audio input</p>
									<span
										className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${tone.badge}`}
									>
										{status.label}
									</span>
								</div>
								<p className="mt-1 text-xs leading-5 text-zinc-500">
									{audioInput.error?.message ?? status.text}
								</p>
							</div>
						</div>
						<Button
							type="button"
							size="sm"
							variant={isActive ? 'ghost' : 'default'}
							className={
								isActive
									? 'text-zinc-200 hover:bg-zinc-800 hover:text-white'
									: 'bg-cyan-500 text-zinc-950 hover:bg-cyan-400'
							}
							disabled={isRequesting || isUnavailable}
							onClick={() => {
								if (isActive) {
									onDisable();
								} else {
									void onEnable(audioInput.selectedDeviceId || undefined);
								}
							}}
						>
							{isRequesting && <Loader2 className="w-4 h-4 animate-spin" />}
							{getActionLabel(audioInput)}
						</Button>
					</div>
				</section>

				<section className="p-3 rounded-lg bg-zinc-900/30 border border-white/5 space-y-3">
					<div className="flex items-center justify-between gap-3">
						<Label htmlFor="audio-input-device" className="text-sm font-medium text-white">
							input device
						</Label>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									size="icon-sm"
									variant="ghost"
									className="text-zinc-400 hover:text-white hover:bg-zinc-800"
									disabled={isRequesting || audioInput.isRefreshingDevices}
									onClick={() => void onRefreshDevices()}
									aria-label="Refresh audio input devices"
								>
									<RefreshCw
										className={`w-4 h-4 ${audioInput.isRefreshingDevices ? 'animate-spin' : ''}`}
									/>
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>refresh audio inputs</p>
							</TooltipContent>
						</Tooltip>
					</div>

					<select
						id="audio-input-device"
						value={audioInput.selectedDeviceId || DEFAULT_INPUT_VALUE}
						disabled={isRequesting}
						onChange={(event) => {
							const deviceId = event.target.value === DEFAULT_INPUT_VALUE ? '' : event.target.value;
							void onSelectDevice(deviceId);
						}}
						className="h-9 w-full rounded-md border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none transition-colors hover:border-white/20 focus:border-cyan-400/60 disabled:cursor-not-allowed disabled:opacity-50"
					>
						<option value={DEFAULT_INPUT_VALUE}>default input</option>
						{audioInput.devices.map((device) => (
							<option key={device.deviceId || device.label} value={device.deviceId}>
								{device.label}
							</option>
						))}
					</select>
				</section>

				<section className="p-3 rounded-lg bg-zinc-900/30 border border-white/5 space-y-3">
					<div className="flex items-center justify-between gap-3">
						<div className="flex items-center gap-2 text-sm font-medium text-white">
							<Volume2 className="w-4 h-4 text-lime-300" />
							level
						</div>
						<p className="truncate text-xs text-zinc-500">{selectedLabel}</p>
					</div>
					<div
						className="h-2 rounded-full bg-zinc-800 overflow-hidden"
						role="progressbar"
						aria-label="Audio input level"
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={levelPercent}
					>
						<div
							className="h-full rounded-full bg-lime-300 transition-[width] duration-75"
							style={{ width: `${levelPercent}%` }}
						/>
					</div>
				</section>
			</div>
		</ScrollArea>
	);
}

function getStatusIcon(status: AudioInputStatus) {
	if (status === 'requesting' || status === 'checking') return <Loader2 className="w-4 h-4 animate-spin" />;
	if (status === 'active') return <CheckCircle2 className="w-4 h-4" />;
	if (status === 'permission-denied' || status === 'unavailable' || status === 'error')
		return <XCircle className="w-4 h-4" />;
	return <Mic2 className="w-4 h-4" />;
}

function getActionLabel(audioInput: AudioInputState): string {
	if (audioInput.status === 'requesting') return 'Enabling...';
	if (audioInput.status === 'active') return 'Stop input';
	if (audioInput.error?.retryable) return 'Retry';
	return 'Enable input';
}

function getSelectedDeviceLabel(audioInput: AudioInputState): string {
	if (!audioInput.enabled) return 'stopped';
	if (!audioInput.selectedDeviceId) return 'default input';
	return (
		audioInput.devices.find((device) => device.deviceId === audioInput.selectedDeviceId)?.label ?? 'selected input'
	);
}
