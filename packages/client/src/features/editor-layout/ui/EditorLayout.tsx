import { useCallback } from 'react';
import { EditorPane } from './EditorPane';

export interface EditorLayoutProps {
	/** Whether to show editor backdrop */
	editorBackdrop?: boolean;
	/** Callback when the textmode container is ready */
	onTextmodeReady?: (container: HTMLElement) => void;
}

/**
 * EditorLayout component - the main layout wrapper.
 * Renders a single full-size editor pane.
 */
export function EditorLayout({ editorBackdrop = false, onTextmodeReady }: EditorLayoutProps) {
	const handleContainerReady = useCallback(
		(container: HTMLElement) => {
			onTextmodeReady?.(container);
		},
		[onTextmodeReady]
	);

	return (
		<div
			className="app-layout-container"
			style={{
				display: 'flex',
				width: '100%',
				height: '100%',
			}}
		>
			<div className="layout-pane" style={{ width: '100%', height: '100%' }}>
				<EditorPane hasBackdrop={editorBackdrop} onContainerReady={handleContainerReady} />
			</div>
		</div>
	);
}
