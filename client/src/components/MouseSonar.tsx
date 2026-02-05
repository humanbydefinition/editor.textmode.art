import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

export interface MouseSonarHandle {
    ping: () => void;
}

/**
 * Renders a large cursor that grows in opacity/size when the mouse is shaken.
 */
export const MouseSonar = forwardRef<MouseSonarHandle>((_, ref) => {
    const cursorRef = useRef<HTMLDivElement>(null);
    const wasVisible = useRef(false);

    // Mutable state for the animation loop
    const state = useRef({
        x: 0,
        y: 0,
        lastX: 0,
        lastY: 0,
        velocity: 0,
        shakeScore: 0,
        scale: 0.166, // Start at 1/6th scale (32px / 192px)
        visible: false
    });

    const rafId = useRef<number>(0);

    // Initial position setup
    useEffect(() => {
        state.current.x = window.innerWidth / 2;
        state.current.y = window.innerHeight / 2;

        // Cleanup cursor hide on unmount
        return () => {
            document.body.style.cursor = '';
        };
    }, []);

    // Animation loop
    useEffect(() => {
        let lastTime = performance.now();

        const loop = (time: number) => {
            const dt = Math.min((time - lastTime) / 1000, 0.1);
            lastTime = time;

            const s = state.current;

            // Decaying shake score
            s.shakeScore *= Math.max(0, 1 - 4 * dt);
            s.velocity *= Math.max(0, 1 - 10 * dt);

            // Visibility threshold
            const activationThreshold = 1500;
            const maxScore = 8000;

            let targetScale = 0.166; // Baseline scale (~32px)
            let targetOpacity = 0;

            // We consider it "active" if score is high enough
            const isActive = s.shakeScore > activationThreshold;

            if (isActive) {
                // Determine progress from threshold to max
                const relativeScore = Math.min(s.shakeScore - activationThreshold, maxScore - activationThreshold);
                const progress = relativeScore / (maxScore - activationThreshold);

                // Scale from 0.166 (baseline) to 1.0 (max size ~192px)
                targetScale = 0.166 + (0.834 * progress * 1.5); // Overshoot slightly for effect
                targetScale = Math.min(targetScale, 1.2); // Cap at 1.2x max resolution

                targetOpacity = Math.min(1, progress * 4);
            }

            // Smoothly interpolate
            // Use faster interpolation for snapping back, smoother for growing
            const lerpFactor = isActive ? 8 : 12;
            s.scale = s.scale + (targetScale - s.scale) * lerpFactor * dt;

            // Hysteresis for visibility to prevent flickering
            const visible = s.scale > 0.18; // Slightly above baseline

            // Manage system cursor visibility
            if (visible !== wasVisible.current) {
                wasVisible.current = visible;
                if (visible) {
                    document.body.style.cursor = 'none';
                } else {
                    document.body.style.cursor = '';
                }
            }

            // Update DOM
            if (cursorRef.current) {
                if (visible) {
                    cursorRef.current.style.display = 'block';
                    cursorRef.current.style.opacity = targetOpacity.toFixed(3);
                    // Transform origin is top-left, so it grows from the mouse tip
                    cursorRef.current.style.transform = `translate3d(${s.x - 4}px, ${s.y - 4}px, 0) scale(${s.scale})`;
                } else {
                    cursorRef.current.style.display = 'none';
                }
            }

            rafId.current = requestAnimationFrame(loop);
        };

        rafId.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId.current);
    }, []);

    // Track mouse position
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const s = state.current;
            s.lastX = s.x;
            s.lastY = s.y;
            s.x = e.clientX;
            s.y = e.clientY;

            // Calculate instantaneous velocity
            const dist = Math.hypot(s.x - s.lastX, s.y - s.lastY);

            // Add to shake score based on speed
            if (dist > 5) {
                s.shakeScore += dist * 5;
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Expose ping method
    const ping = useCallback(() => {
        state.current.shakeScore = 10000;
    }, []);

    useImperativeHandle(ref, () => ({ ping }), [ping]);

    return (
        <div
            ref={cursorRef}
            className="mouse-sonar-cursor"
            style={{
                display: 'none',
                position: 'fixed',
                top: 0,
                left: 0,
                pointerEvents: 'none',
                zIndex: 9999,
                willChange: 'transform, opacity',
                width: 192,
                height: 192,
                transformOrigin: '0 0',
            }}
        >
            <svg
                width="100%"
                height="100%"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                    width: '100%',
                    height: '100%',
                    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.4))'
                }}
            >
                <path
                    d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
                    fill="white"
                    stroke="black"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>
        </div>
    );
});

MouseSonar.displayName = 'MouseSonar';
