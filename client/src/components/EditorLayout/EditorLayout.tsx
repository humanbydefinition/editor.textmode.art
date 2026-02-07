import { useCallback, useState } from 'react';
import { useSplitResize } from './useSplitResize';
import { EditorPane } from './EditorPane';

import { useAppStore } from '@/stores/appStore';
import { selectActivePanel, selectIsMobile } from '@/state/selectors';
import type { PaneConfig } from './types';

export interface EditorLayoutProps {
    /** Pane configurations */
    panes: PaneConfig[];
    /** Initial split ratio */
    initialSplitRatio?: number;
    /** Whether to show editor backdrop */
    editorBackdrop?: boolean;
    /** Callback when a pane container is ready */
    onPaneReady?: (paneId: string, container: HTMLElement) => void;
}

/**
 * AppLayout component - the main layout wrapper.
 * Always renders all panes to preserve Monaco editors on layout switches.
 */
export function EditorLayout({
    panes,
    initialSplitRatio = 0.5,
    editorBackdrop = false,
    onPaneReady,
}: EditorLayoutProps) {
    // Get mobile state from Zustand store
    const isMobile = useAppStore(selectIsMobile);
    const activePanel = useAppStore(selectActivePanel);

    // Split ratio state
    const [splitRatio, setSplitRatio] = useState(initialSplitRatio);

    // Split resize hook for desktop mode
    const { resizerProps, containerRef } = useSplitResize({
        initialRatio: splitRatio,
        direction: 'horizontal',
        onRatioChange: setSplitRatio,
    });

    // Handle container ready
    const handleContainerReady = useCallback(
        (paneId: string, container: HTMLElement) => {
            onPaneReady?.(paneId, container);
        },
        [onPaneReady]
    );

    // Use activePanel from store or default to first pane
    const activePaneId =
        panes.find((pane) => pane.id === activePanel)?.id ??
        panes[0]?.id ??
        '';

    // Calculate pane dimensions based on orientation
    const resizerSize = 8;
    const hasSplit = panes.length >= 2;

    const firstPaneStyle: React.CSSProperties = !hasSplit
        ? { width: '100%', height: '100%' }
        : isMobile
            ? { width: '100%', height: '100%' }
            : { width: `calc(${splitRatio * 100}% - ${resizerSize / 2}px)`, height: '100%', flex: 'none' };

    const secondPaneStyle: React.CSSProperties = isMobile
        ? { width: '100%', height: '100%' }
        : { width: `calc(${(1 - splitRatio) * 100}% - ${resizerSize / 2}px)`, height: '100%', flex: 'none' };

    const primaryPane = panes[0];
    const secondaryPane = panes[1];

    return (
        <>
            {/* Mobile navigation - moved to AppShell */}

            <div
                ref={containerRef}
                className={`app-layout-container ${isMobile ? 'tab-layout' : ''}`}
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    width: '100%',
                    height: '100%',
                }}
            >
                {/* First pane */}
                {primaryPane && (
                    <div
                        className={`layout-pane ${isMobile && primaryPane.id !== activePaneId ? 'hidden' : ''}`}
                        style={firstPaneStyle}
                    >
                        <EditorPane
                            paneId={primaryPane.id}
                            engineId={primaryPane.engineId}
                            hasBackdrop={editorBackdrop}
                            onContainerReady={handleContainerReady}
                        />
                    </div>
                )}

                {/* Resizer (hidden on mobile) */}
                {!isMobile && hasSplit && (
                    <div
                        id="split-resizer"
                        {...resizerProps}
                        className={`${resizerProps.className} resizer-vertical`}
                        style={{
                            flexShrink: 0,
                            width: `${resizerSize}px`,
                            height: '100%',
                            cursor: 'col-resize',
                        }}
                    />
                )}

                {/* Second pane */}
                {secondaryPane && (
                    <div
                        className={`layout-pane ${isMobile && secondaryPane.id !== activePaneId ? 'hidden' : ''}`}
                        style={secondPaneStyle}
                    >
                        <EditorPane
                            paneId={secondaryPane.id}
                            engineId={secondaryPane.engineId}
                            hasBackdrop={editorBackdrop}
                            onContainerReady={handleContainerReady}
                        />
                    </div>
                )}
            </div>
        </>
    );
}
