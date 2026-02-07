import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { SlugInfoCard } from './SlugInfoCard';

export function SlugInfoAlert() {
    const sketch = useAppStore((state) => state.approvedSketch);
    const [dismissedSlug, setDismissedSlug] = useState<string | null>(null);
    const [visible, setVisible] = useState(false);
    const alertRef = useRef<HTMLDivElement>(null);
    const isDismissed = sketch ? dismissedSlug === sketch.slug : false;

    // Animate in on mount
    useEffect(() => {
        if (sketch && !isDismissed) {
            setVisible(false);
            const frame = requestAnimationFrame(() => setVisible(true));
            return () => cancelAnimationFrame(frame);
        }
    }, [sketch, isDismissed]);

    if (!sketch || isDismissed) return null;

    return (
        <div
            ref={alertRef}
            className={[
                // Safe-area-aware positioning — uses inset so total width = 100vw − insets
                'fixed inset-x-3 top-3 sm:inset-x-auto sm:top-4 sm:left-4 z-[120] pointer-events-auto',
                // Max width only kicks in on wider viewports where we pin to the left
                'sm:max-w-[min(calc(100vw-2rem),360px)]',
                // Entry animation
                'transition-all duration-300 ease-out',
                visible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 -translate-y-2',
            ].join(' ')}
            role="region"
            aria-label="Sketch information"
        >
            <SlugInfoCard
                sketch={sketch}
                showDismiss
                onDismiss={() => {
                    setVisible(false);
                    // Wait for fade-out before unmounting
                    setTimeout(() => setDismissedSlug(sketch.slug), 200);
                }}
            />
        </div>
    );
}
