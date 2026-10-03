"use client";

import type { ComponentPropsWithRef } from "react";

import { cx } from "@/lib/cx";

import { Icon } from "./Icon";

type ButtonProps = ComponentPropsWithRef<"button">;

export type AnswerTileProps = Omit<ButtonProps, "type" | "aria-pressed" | "onClick"> & {
	selected: boolean;
	onClick: NonNullable<ButtonProps["onClick"]>;
};

/**
 * One answer to a choice question: a tile at least 60 px tall whose label wraps and stays centred.
 * A selected tile fills with the accent and a check comes before the label; aria-pressed carries the
 * same state. The fill changes at press speed, so the tap reads as answered at once.
 */
export function AnswerTile({ selected, disabled, className, children, ...props }: AnswerTileProps) {
	return (
		<button
			type="button"
			aria-pressed={selected}
			disabled={disabled}
			className={cx(
				"inline-flex min-h-15 w-full items-center justify-center gap-2 rounded-tile border-2 px-4 py-3 text-center type-answer",
				"transition-[color,background-color,border-color,opacity] duration-(--ct-duration-press) ease-standard",
				"not-disabled:active:opacity-90 disabled:cursor-not-allowed disabled:opacity-50",
				selected
					? "border-accent bg-accent text-on-accent"
					: "border-ink bg-island text-ink not-disabled:hover:bg-well",
				className
			)}
			{...props}>
			{selected && <Icon name="check" className="shrink-0" />}
			<span className="min-w-0">{children}</span>
		</button>
	);
}
