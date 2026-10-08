import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/cx";

export type MonoVariant = "data" | "label" | "code" | "title";

export type MonoProps = {
	as?: "span" | "p" | "div" | "code" | "strong" | "dt" | "dd" | "h1" | "h2" | "h3";
	/**
	 * data: IDs, versions, counts and times in a line (14 px). label: the uppercase eyebrow (13 px).
	 * code: a code to copy or type (40 px, wide tracking). title: an identifier used as a page title.
	 */
	variant?: MonoVariant;
	className?: string;
	children?: ReactNode;
} & HTMLAttributes<HTMLElement>;

const VARIANT: Record<MonoVariant, string> = {
	data: "type-mono-data",
	label: "type-mono-label",
	code: "type-mono-code",
	title: "type-mono-title"
};

/** Spline Sans Mono, for anything someone might read aloud: OBS-0249, v3, demo-v1, DECA2026, "4 of 6". */
export function Mono({ as: Element = "span", variant = "data", className, children, ...rest }: MonoProps) {
	return (
		<Element {...rest} className={cx(VARIANT[variant], className)}>
			{children}
		</Element>
	);
}
