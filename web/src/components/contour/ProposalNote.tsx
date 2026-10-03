import type { ReactNode } from "react";

import { stateOf } from "@/lib/contour";
import { cx } from "@/lib/cx";

import { Icon, isIconName } from "./Icon";

export type ProposalNoteProps = {
	/** The open decision this screen previews, such as "U5". */
	code: string;
	/** What is proposed and what is not decided. */
	children: ReactNode;
	/** Label and text on one line, for a banner across the page (project-09). Stacked by default. */
	inline?: boolean;
	className?: string;
};

/**
 * The "PROPOSAL Ux" flag. Every screen that shows a proposal-only concept carries one, so a preview is
 * never read as a decision.
 */
export function ProposalNote({ code, children, inline = false, className }: ProposalNoteProps) {
	const proposal = stateOf("proposal", "open");
	const glyph = isIconName(proposal.icon) ? proposal.icon : "flag";

	// The label box is one body line tall, so inline it centres on the first line of the text.
	const label = (
		<p className="flex h-6 shrink-0 items-center gap-2 whitespace-nowrap type-mono-label text-waiting">
			<Icon name={glyph} size={16} className="shrink-0" />
			{proposal.label} {code}
		</p>
	);

	return (
		<div
			role="note"
			className={cx(
				"rounded-note bg-waiting-soft px-4 py-3",
				inline && "flex flex-wrap items-start gap-x-3 gap-y-1",
				className
			)}>
			{label}
			<div className={cx("min-w-0 type-body text-ink", inline && "flex-1 basis-60")}>{children}</div>
		</div>
	);
}
