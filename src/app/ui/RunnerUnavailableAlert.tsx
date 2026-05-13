import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { RotateCcw } from 'lucide-react';

interface RunnerUnavailableAlertProps {
    isVisible: boolean;
    isReconnecting: boolean;
    onReconnect: () => void;
}

export function RunnerUnavailableAlert({
    isVisible,
    isReconnecting,
    onReconnect,
}: RunnerUnavailableAlertProps) {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-3 sm:p-6">
            <div
                className={cn(
                    'pointer-events-auto',
                    'w-full max-w-xl rounded-xl border border-white/12',
                    'bg-zinc-950/70 backdrop-blur-md shadow-[0_24px_80px_rgba(0,0,0,0.55)]',
                    'px-4 py-3 sm:px-5 sm:py-4 text-zinc-100'
                )}
            >
                <p className="text-[11px] uppercase tracking-[0.16em] text-amber-300/95">runner offline</p>
                <h2 className="mt-1 text-sm sm:text-base font-semibold text-zinc-100">sandbox runner is not reachable</h2>
                <p className="mt-1 text-xs sm:text-sm leading-relaxed text-zinc-300/95">
                    visuals are paused because the sandbox runner failed to load.
                </p>
                <div className="mt-3 sm:mt-4 flex justify-end">
					<Button
						type="button"
						size="sm"
						variant="secondary"
						onClick={onReconnect}
						disabled={isReconnecting}
						className={cn(
							'gap-2 rounded-full border border-white/10 bg-zinc-900/95 text-zinc-100 shadow-lg hover:bg-zinc-800 disabled:opacity-100',
							isReconnecting &&
								'border-white/15 bg-zinc-900/95 text-zinc-400 shadow-[0_12px_32px_rgba(0,0,0,0.35)] disabled:bg-zinc-900/95 disabled:text-zinc-400'
						)}
						aria-live="polite"
						aria-busy={isReconnecting}
					>
                        <RotateCcw
                            className={cn(
                                'h-3.5 w-3.5 transition-transform duration-300',
                                isReconnecting ? 'animate-spin' : ''
                            )}
                        />
                        {isReconnecting ? 'reconnecting…' : 'reconnect runner'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
