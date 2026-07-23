export interface EditorLayoutProps {
	/** Whether to show editor backdrop */
	editorBackdrop?: boolean;
	/** Callback when the textmode container is ready */
	onTextmodeReady?: (container: HTMLElement) => void;
}

/**
 * EditorLayout component - the single full-size editor pane.
 */
export function EditorLayout({ editorBackdrop = false, onTextmodeReady }: EditorLayoutProps) {
	return (
		<div
			ref={(container) => {
				if (container) {
					onTextmodeReady?.(container);
				}
			}}
			id="editor-panel-textmode"
			className={`layout-pane panel-editor ${editorBackdrop ? 'editor-backdrop' : ''}`}
		/>
	);
}
