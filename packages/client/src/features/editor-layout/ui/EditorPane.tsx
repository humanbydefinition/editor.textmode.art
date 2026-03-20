export interface EditorPaneProps {
	/** Callback when container is ready */
	onContainerReady?: (container: HTMLElement) => void;
	/** Whether to apply editor backdrop effect */
	hasBackdrop?: boolean;
	/** Additional class name */
	className?: string;
}

/**
 * EditorPane component - provides a container for Monaco editors.
 */
export function EditorPane({ onContainerReady, hasBackdrop = false, className = '' }: EditorPaneProps) {
	return (
		<div
			ref={(container) => {
				if (container) {
					onContainerReady?.(container);
				}
			}}
			id="editor-panel-textmode"
			className={`layout-pane panel-editor ${hasBackdrop ? 'editor-backdrop' : ''} ${className}`}
			style={{
				position: 'relative',
				width: '100%',
				height: '100%',
			}}
		/>
	);
}
