import { useState, useCallback, useEffect, useRef } from 'react';

export interface UseSplitResizeOptions {
    /** Initial split ratio (0-1) */
    initialRatio?: number;
    /** Minimum ratio (default 0.2) */
    minRatio?: number;
    /** Maximum ratio (default 0.8) */
    maxRatio?: number;
    /** Direction of split */
    direction?: 'horizontal' | 'vertical';
    /** Callback when ratio changes */
    onRatioChange?: (ratio: number) => void;
}

export interface UseSplitResizeReturn {
    /** Current split ratio */
    ratio: number;
    /** Whether currently dragging */
    isDragging: boolean;
    /** Props to spread on the resizer element */
    resizerProps: {
        onMouseDown: (e: React.MouseEvent) => void;
        onTouchStart: (e: React.TouchEvent) => void;
        className: string;
    };
    /** Ref for the container element */
    containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Hook for split pane resizing.
 */
export function useSplitResize(options: UseSplitResizeOptions = {}): UseSplitResizeReturn {
    const {
        initialRatio = 0.5,
        minRatio = 0.2,
        maxRatio = 0.8,
        direction = 'horizontal',
        onRatioChange,
    } = options;

    const [ratio, setRatio] = useState(initialRatio);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Clamp ratio between min and max
    const clampRatio = useCallback(
        (r: number) => Math.max(minRatio, Math.min(maxRatio, r)),
        [minRatio, maxRatio]
    );

    // Handle mouse/touch move during drag
    const handleMove = useCallback(
        (clientX: number, clientY: number) => {
            if (!containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            let newRatio: number;

            if (direction === 'horizontal') {
                newRatio = (clientX - rect.left) / rect.width;
            } else {
                newRatio = (clientY - rect.top) / rect.height;
            }

            const clampedRatio = clampRatio(newRatio);
            setRatio(clampedRatio);
            onRatioChange?.(clampedRatio);
        },
        [direction, clampRatio, onRatioChange]
    );

    // Start dragging
    const startDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        setIsDragging(true);
        document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
        document.body.style.userSelect = 'none';
    }, [direction]);

    // Stop dragging
    const stopDrag = useCallback(() => {
        setIsDragging(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, []);

    // Add global mouse/touch listeners when dragging
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length > 0) {
                handleMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', stopDrag);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', stopDrag);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', stopDrag);
        };
    }, [isDragging, handleMove, stopDrag]);

    return {
        ratio,
        isDragging,
        resizerProps: {
            onMouseDown: startDrag,
            onTouchStart: startDrag,
            className: isDragging ? 'dragging' : '',
        },
        containerRef,
    };
}
