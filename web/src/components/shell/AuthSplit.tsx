import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

export type AuthSplitProps = {
	/** The left column: one AuthPanel. */
	children: ReactNode;
	/** The right column, usually the field-operations hero island. */
	hero?: ReactNode;
	className?: string;
};

/**
 * The split frame of the sign-in, account and invitation pages (Org 6–12): the form on the left, at most
 * 480 px wide, and the hero island on the right, the two centred against each other. Below 1024 px the
 * page becomes one centred column with the island under the form; below 768 px the island is left out,
 * so a phone shows only the form.
 */
export function AuthSplit({ children, hero, className }: AuthSplitProps) {
	return (
		<div
			className={cx(
				"mx-auto flex w-full max-w-(--container-page) flex-1 flex-col items-center gap-10 px-4 pt-6 pb-14 md:px-gutter xl:px-23",
				"lg:flex-row lg:items-center lg:gap-14 xl:gap-16",
				className
			)}>
			<div className="w-full max-w-120 lg:w-100 lg:max-w-none lg:shrink-0 xl:w-115">{children}</div>
			{hero != null && (
				<div className="hidden w-full max-w-120 md:block lg:max-w-none lg:min-w-0 lg:flex-1">{hero}</div>
			)}
		</div>
	);
}

export type AuthPanelProps = {
	/** The mono eyebrow, typed in sentence case: "DECA Mark · Research in place". */
	kicker: ReactNode;
	title: ReactNode;
	/** One or two sentences in secondary ink under the title. */
	lead?: ReactNode;
	/** The form or the decision the page asks for. */
	children?: ReactNode;
	/** A closing line in secondary ink. */
	footnote?: ReactNode;
	/** Set the footnote under a rule (the default) or directly under the actions. */
	footnoteRule?: boolean;
	className?: string;
};

/** The left column of an AuthSplit: eyebrow, auth title, lead, the form and its footnote. */
export function AuthPanel({ kicker, title, lead, children, footnote, footnoteRule = true, className }: AuthPanelProps) {
	return (
		<div className={className}>
			<p className="type-mono-label text-ink-2">{kicker}</p>
			<h1 id="page-title" tabIndex={-1} className="mt-3 type-page text-ink sm:type-auth">
				{title}
			</h1>
			{lead != null && <div className="mt-3 type-lead text-ink-2">{lead}</div>}
			{children != null && <div className="mt-8">{children}</div>}
			{footnote != null && (
				<div className={cx("type-body text-ink-2", footnoteRule ? "mt-6 border-t border-line pt-4" : "mt-5")}>
					{footnote}
				</div>
			)}
		</div>
	);
}
