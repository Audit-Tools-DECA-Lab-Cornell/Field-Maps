import { Note } from "@/components/contour/Note";

export type NotAvailableProps = {
	/** The feature, as the start of a sentence: "Deleting a project". */
	title: string;
	/** One sentence: why it is not here yet. */
	reason?: string;
	/** One sentence: what to do instead. */
	instead?: string;
	className?: string;
};

/**
 * A feature DECA Mark does not have yet, said plainly in place of a button that would not work:
 * "Deleting a project is not available yet." Then why, and what to do instead.
 */
export function NotAvailable({ title, reason, instead, className }: NotAvailableProps) {
	const rest = [reason, instead].filter(Boolean).join(" ");
	return (
		<Note tone="neutral" icon="info" title={`${title} is not available yet.`} className={className}>
			{rest || undefined}
		</Note>
	);
}
