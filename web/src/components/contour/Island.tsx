import { type HTMLAttributes, type ReactNode, useId } from "react";

import { cx } from "@/lib/cx";

import { Icon, type IconName } from "./Icon";

export type IslandProps = {
	as?: "section" | "div" | "article";
	/** The island's heading. A titled section or article is named by it. */
	title?: ReactNode;
	/** Secondary words on the right of the header: a count ("3 items"), a state, a scope. */
	meta?: ReactNode;
	/** Controls on the right of the header, usually one TextLink. */
	actions?: ReactNode;
	/**
	 * danger: no fill (the ground shows through), a 2 px attention edge, no ledge, and an attention title
	 * with the warning glyph (org-04, "Delete organization").
	 */
	tone?: "default" | "danger";
	/** No body padding, for a table, a list of ruled rows or a map that runs to the edges. */
	flush?: boolean;
	/** A rule under the header. On by default for a flush body, where a table or ruled list starts at the rule. */
	divided?: boolean;
	/** A closing line under a rule, in secondary type. */
	footnote?: ReactNode;
	headingLevel?: 2 | 3;
	titleIcon?: IconName;
	className?: string;
	children?: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "title">;

/**
 * The Contour container: a white island with a fine edge and a ledge beneath (system-05). Islands are
 * where content lives; the ground between them stays empty.
 */
export function Island({
	as: Element = "section",
	title,
	meta,
	actions,
	tone = "default",
	flush = false,
	divided = flush,
	footnote,
	headingLevel = 2,
	titleIcon,
	className,
	children,
	...rest
}: IslandProps) {
	const titleId = useId();
	const Heading = headingLevel === 3 ? "h3" : "h2";
	const danger = tone === "danger";
	const glyph = titleIcon ?? (danger ? "triangle-alert" : undefined);
	const hasHeader = title != null || meta != null || actions != null;
	const hasBody = children != null && children !== false;
	// A generic div may not carry a name; a titled section or article becomes a named region.
	const labelledBy = title != null && Element !== "div" ? titleId : undefined;

	return (
		<Element
			aria-labelledby={labelledBy}
			{...rest}
			className={cx(
				"min-w-0 rounded-island text-ink",
				danger ? "border-2 border-attention" : "border border-line bg-island shadow-ledge",
				flush && "overflow-hidden",
				className
			)}>
			{hasHeader && (
				<div
					className={cx(
						"flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 px-island-pad pt-6",
						hasBody || footnote != null ? "pb-4" : "pb-6",
						divided && "border-b border-rule"
					)}>
					{title != null && (
						<Heading
							id={titleId}
							className={cx(
								"flex min-w-0 items-baseline gap-2 type-island",
								danger ? "text-attention" : "text-ink"
							)}>
							{glyph && <Icon name={glyph} size={18} className="mt-1 shrink-0 self-start" />}
							<span className="min-w-0">{title}</span>
						</Heading>
					)}
					{/* Plain spaces between the parts keep a title, a count and a link apart when read as text. */}{" "}
					{(meta != null || actions != null) && (
						<div
							className={cx("flex flex-wrap items-baseline gap-x-4 gap-y-2", title == null && "ml-auto")}>
							{meta != null && <div className="type-small text-ink-2">{meta}</div>} {actions}
						</div>
					)}
				</div>
			)}{" "}
			{hasBody && (
				<div
					className={cx(
						!flush && "px-island-pad pb-island-pad",
						!flush && (!hasHeader ? "pt-island-pad" : divided && "pt-4")
					)}>
					{children}
				</div>
			)}{" "}
			{footnote != null && (
				<div className="border-t border-rule px-island-pad py-4 type-small text-ink-2">{footnote}</div>
			)}
		</Element>
	);
}

export type IslandSectionProps = {
	as?: "div" | "section";
	/** A rule above the section, separating it from the part before. */
	rule?: boolean;
	className?: string;
	children?: ReactNode;
} & HTMLAttributes<HTMLElement>;

/** One padded part of a multi-part island: a ruled row of checks, a block of facts, a closing action. */
export function IslandSection({ as: Element = "div", rule = false, className, children, ...rest }: IslandSectionProps) {
	return (
		<Element {...rest} className={cx("px-island-pad py-4", rule && "border-t border-rule", className)}>
			{children}
		</Element>
	);
}
