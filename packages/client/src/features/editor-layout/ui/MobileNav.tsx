import { useAppStore } from '@/platform/state/appStore';
import { cn } from '@/shared/lib/cn';
import { selectActivePaneId, selectIsMobile, selectPanes } from '@/platform/state/selectors';

/**
 * Mobile tab bar for switching between editor panes.
 * Only renders when in mobile mode.
 */
export function MobileNav() {
    const isMobile = useAppStore(selectIsMobile);
    const activePaneId = useAppStore(selectActivePaneId);
    const panes = useAppStore(selectPanes);
    const setActivePaneId = useAppStore((state) => state.setActivePaneId);

    // Don't render on desktop
    if (!isMobile || panes.length <= 1) {
        return null;
    }

    return (
        <div className={cn(
            "fixed top-2 left-2 z-50 pointer-events-auto",
            "h-6 flex items-center p-0.5 gap-0.5",
            "rounded-full border border-white/10",
            "bg-zinc-900/40 backdrop-blur-md",
            "transition-all duration-300"
        )}>
            {panes.map((pane) => (
                <button
                    key={pane.id}
                    className={cn(
                        "h-full px-2 text-[10px] lowercase font-medium rounded-full transition-all flex items-center",
                        activePaneId === pane.id
                            ? "bg-white/10 text-white shadow-sm"
                            : "text-zinc-500 hover:text-zinc-300"
                    )}
                    onClick={() => setActivePaneId(pane.id)}
                >
                    {pane.label}
                </button>
            ))}
        </div>
    );
}
