export class AgentMutationQueue {
	private tail = Promise.resolve();
	private active = false;

	async run<T>(signal: AbortSignal, task: () => Promise<T>): Promise<T> {
		if (signal.aborted) throw new DOMException('Operation aborted', 'AbortError');
		const previous = this.tail;
		let release!: () => void;
		this.tail = new Promise<void>((resolve) => {
			release = resolve;
		});
		await previous;
		if (signal.aborted) {
			release();
			throw new DOMException('Operation aborted', 'AbortError');
		}
		this.active = true;
		try {
			return await task();
		} finally {
			this.active = false;
			release();
		}
	}

	isActive(): boolean {
		return this.active;
	}
}
