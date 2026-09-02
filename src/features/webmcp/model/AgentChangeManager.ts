import type { AgentProposalView } from './contracts';

type Proposal = AgentProposalView & { baseline: string; candidate: string };

export class AgentChangeManager {
	private proposal: Proposal | null = null;

	stage(input: { baseline: string; candidate: string; baseRevision: number; summary: string }): AgentProposalView {
		if (this.proposal) throw new Error('A proposal is already awaiting review');
		const counts = changedLines(input.baseline, input.candidate);
		this.proposal = {
			id: crypto.randomUUID(),
			summary: input.summary,
			baseRevision: input.baseRevision,
			addedLines: counts.added,
			removedLines: counts.removed,
			status: 'review',
			baseline: input.baseline,
			candidate: input.candidate,
		};
		return this.view();
	}

	getCandidate(): { baseline: string; candidate: string; revision: number } | null {
		return this.proposal
			? {
					baseline: this.proposal.baseline,
					candidate: this.proposal.candidate,
					revision: this.proposal.baseRevision,
				}
			: null;
	}

	setPreview(
		status: Extract<AgentProposalView['status'], 'previewing' | 'preview-ready' | 'preview-error'>,
		error?: string
	): AgentProposalView | null {
		if (!this.proposal) return null;
		this.proposal.status = status;
		this.proposal.error = error;
		return this.view();
	}

	clear(): void {
		this.proposal = null;
	}

	view(): AgentProposalView {
		if (!this.proposal) throw new Error('No active proposal');
		return {
			id: this.proposal.id,
			summary: this.proposal.summary,
			baseRevision: this.proposal.baseRevision,
			addedLines: this.proposal.addedLines,
			removedLines: this.proposal.removedLines,
			status: this.proposal.status,
			error: this.proposal.error,
		};
	}
}

function changedLines(before: string, after: string): { added: number; removed: number } {
	const beforeLines = new Set(before.split('\n'));
	const afterLines = new Set(after.split('\n'));
	return {
		added: after.split('\n').filter((line) => !beforeLines.has(line)).length,
		removed: before.split('\n').filter((line) => !afterLines.has(line)).length,
	};
}
