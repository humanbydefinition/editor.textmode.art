import { useAppStore } from '@/stores/appStore';
import { cn } from '@/utils/utils';

/**
 * Mobile tab bar for switching between editor panels.
 * Only renders when in mobile mode.
 */
export function MobileNav() {
    const isMobile = useAppStore((state) => state.isMobile);
    const activePanel = useAppStore((state) => state.activePanel);
    const panels = useAppStore((state) => state.panels);
    const setActivePanel = useAppStore((state) => state.setActivePanel);

    // Don't render on desktop
    if (!isMobile || panels.length <= 1) {
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
            {panels.map((panel) => (
                <button
                    key={panel.id}
                    className={cn(
                        "h-full px-2 text-[10px] lowercase font-medium rounded-full transition-all flex items-center",
                        activePanel === panel.id
                            ? "bg-white/10 text-white shadow-sm"
                            : "text-zinc-500 hover:text-zinc-300"
                    )}
                    onClick={() => setActivePanel(panel.id)}
                >
                    {panel.label}
                </button>
            ))}
        </div>
    );
}
