import type { ReactNode } from "react";

/**
 * Every section opens the way a collector screen opens: a quiet label, then the sentence that says
 * what you are looking at, flush left with the whitespace on the right.
 */
export function PageHeader({
	kicker,
	title,
	lead,
	actions
}: {
	readonly kicker: string;
	readonly title: ReactNode;
	readonly lead?: ReactNode;
	readonly actions?: ReactNode;
}) {
	return (
		<header className="flex shrink-0 flex-wrap items-end justify-between gap-base px-gutter pt-wide pb-base">
			<div className="min-w-0 max-w-[60ch]">
				<p className="text-meta text-neutral-400">{kicker}</p>
				<h1 className="mt-tight text-display text-balance text-text">{title}</h1>
				{lead !== undefined && <p className="mt-snug text-detail text-neutral-400">{lead}</p>}
			</div>
			{actions !== undefined && <div className="flex shrink-0 items-center gap-snug">{actions}</div>}
		</header>
	);
}

/** A number worth reading on its own. No box: a label, the figure, and the whitespace around it. */
export function StatTile({
	label,
	value,
	detail,
	tone = "text"
}: {
	readonly label: string;
	readonly value: ReactNode;
	readonly detail?: ReactNode;
	readonly tone?: "text" | "attention" | "accent";
}) {
	const ink = tone === "attention" ? "text-attention-text" : tone === "accent" ? "text-accent-300" : "text-text";
	return (
		<div className="min-w-0">
			<div className="text-micro text-neutral-500">{label}</div>
			<div className={`tnum mt-hair text-title ${ink}`}>{value}</div>
			{detail !== undefined && <div className="mt-hair text-micro text-neutral-600">{detail}</div>}
		</div>
	);
}
