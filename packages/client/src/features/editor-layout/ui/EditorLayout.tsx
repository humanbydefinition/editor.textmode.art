import { useCallback } from 'react';
import { EditorPane } from './EditorPane';

import type { PaneConfig } from '../types';

export interface EditorLayoutProps {
    /** Pane configurations */
    panes: PaneConfig[];
    /** Whether to show editor backdrop */
    editorBackdrop?: boolean;
    /** Callback when a pane container is ready */
    onPaneReady?: (paneId: string, container: HTMLElement) => void;
}

/**
 * EditorLayout component - the main layout wrapper.
 * Renders a single full-size editor pane.
 */
export function EditorLayout({
    panes,
    editorBackdrop = false,
    onPaneReady,
}: EditorLayoutProps) {
    const handleContainerReady = useCallback(
        (paneId: string, container: HTMLElement) => {
            onPaneReady?.(paneId, container);
        },
        [onPaneReady]
    );

    const primaryPane = panes[0];

    return (
        <div
            className="app-layout-container"
            style={{
                display: 'flex',
                width: '100%',
                height: '100%',
            }}
        >
            {primaryPane && (
                <div
                    className="layout-pane"
                    style={{ width: '100%', height: '100%' }}
                >
                    <EditorPane
                        paneId={primaryPane.id}
                        hasBackdrop={editorBackdrop}
                        onContainerReady={handleContainerReady}
                    />
                </div>
            )}
        </div>
    );
}
