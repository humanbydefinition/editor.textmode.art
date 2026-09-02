import type { PreparedExportView } from './contracts';

type Artifact = PreparedExportView & { url: string };

export class PreparedExportStore {
	private artifact: Artifact | null = null;
	private expiryTimer: number | null = null;

	prepare(input: {
		format: PreparedExportView['format'];
		mimeType: string;
		fileName: string;
		data: ArrayBuffer | string;
	}): PreparedExportView {
		this.clear();
		const blob = new Blob([input.data], { type: input.mimeType });
		const artifact: Artifact = {
			id: crypto.randomUUID(),
			format: input.format,
			mimeType: input.mimeType,
			fileName: input.fileName,
			byteLength: blob.size,
			expiresAt: Date.now() + 5 * 60_000,
			url: URL.createObjectURL(blob),
		};
		this.artifact = artifact;
		this.expiryTimer = window.setTimeout(() => this.clear(), 5 * 60_000);
		return this.view();
	}

	download(): boolean {
		const artifact = this.artifact;
		if (!artifact || artifact.expiresAt < Date.now()) return false;
		const anchor = document.createElement('a');
		anchor.href = artifact.url;
		anchor.download = artifact.fileName;
		anchor.click();
		return true;
	}

	view(): PreparedExportView {
		if (!this.artifact) throw new Error('No prepared export');
		return {
			id: this.artifact.id,
			format: this.artifact.format,
			mimeType: this.artifact.mimeType,
			byteLength: this.artifact.byteLength,
			fileName: this.artifact.fileName,
			expiresAt: this.artifact.expiresAt,
		};
	}

	clear(): void {
		if (this.expiryTimer !== null) window.clearTimeout(this.expiryTimer);
		this.expiryTimer = null;
		if (this.artifact) URL.revokeObjectURL(this.artifact.url);
		this.artifact = null;
	}
}
