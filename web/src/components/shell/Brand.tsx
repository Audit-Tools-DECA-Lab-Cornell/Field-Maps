import Link from "next/link";

import { cx } from "@/lib/cx";

export type BrandMarkProps = {
	/** Name the mark only when it stands alone, without the wordmark beside it. */
	label?: string;
	className?: string;
};

/**
 * The FieldMaps mark: an ink rounded square holding two contour rings around the observation point
 * (the collector draws the same mark in mobile/src/ui/Logo.tsx). The point takes the accent as it reads
 * on the ink square, which is the other theme's accent: light magenta on Day's dark square, deep magenta
 * on Dusk's light one. Each point carries the other theme's scope, so its colour still comes from tokens.
 */
export function BrandMark({ label, className }: BrandMarkProps) {
	const a11y = label
		? { role: "img", "aria-label": label }
		: { "aria-hidden": true as const, focusable: "false" as const };
	return (
		<svg viewBox="0 0 72 72" className={cx("size-9 shrink-0", className)} {...a11y}>
			<rect width="72" height="72" rx="17" className="fill-ink" />
			<g transform="rotate(-24 36 36)" fill="none" strokeWidth="3" className="stroke-on-ink">
				<ellipse cx="36" cy="36" rx="23" ry="16.5" />
				<ellipse cx="36" cy="36" rx="13" ry="9.5" />
			</g>
			<g className="dusk:hidden">
				<circle data-theme="dusk" cx="36" cy="36" r="5.5" className="fill-accent" />
			</g>
			<g className="hidden dusk:inline">
				<circle data-theme="day" cx="36" cy="36" r="5.5" className="fill-accent" />
			</g>
		</svg>
	);
}

export type BrandProps = {
	/** Where the brand leads. Without it the lockup is not a link. */
	href?: string;
	/** Hide the "FieldMaps" wordmark (narrow headers); the mark then names itself. */
	markOnly?: boolean;
	/** Show the wordmark from 640 px up only, for a header that needs the room on a phone. */
	wordmarkFromSm?: boolean;
	className?: string;
};

/** The mark and the "FieldMaps" wordmark, as the header's first item. */
export function Brand({ href, markOnly = false, wordmarkFromSm = false, className }: BrandProps) {
	const content = (
		<>
			<BrandMark label={markOnly ? "FieldMaps" : undefined} />
			{!markOnly && (
				<span className={cx("type-island text-ink", wordmarkFromSm && "sr-only sm:not-sr-only")}>
					FieldMaps
				</span>
			)}
		</>
	);
	const classes = cx("inline-flex min-h-touch shrink-0 items-center gap-3 rounded-input", className);

	if (!href) return <span className={classes}>{content}</span>;
	return (
		<Link href={href} className={classes}>
			{content}
		</Link>
	);
}
