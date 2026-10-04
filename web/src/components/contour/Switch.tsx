"use client";

import { Switch as SwitchPrimitive } from "radix-ui";
import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

export type SwitchProps = {
	id: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	label: ReactNode;
	/** A line of secondary ink under the label, linked to the switch by aria-describedby. */
	description?: ReactNode;
	/**
	 * Shows "On" or "Off" beside the track. Contour always shows the word, so state never rests on the
	 * knob's position alone; leave this on.
	 */
	showWord?: boolean;
	disabled?: boolean;
	/** Form submission: the switch posts `name=on` while on. */
	name?: string;
	className?: string;
};

/**
 * A settings row: label and description on the left, the On / Off word and the track on the right.
 * Pressing the label toggles it. The track is ink when on and outlined when off; the knob slides.
 */
export function Switch({
	id,
	checked,
	onCheckedChange,
	label,
	description,
	showWord = true,
	disabled = false,
	name,
	className
}: SwitchProps) {
	const descriptionId = description ? `${id}-description` : undefined;

	return (
		<div className={cx("flex min-h-touch items-center justify-between gap-4", disabled && "opacity-50", className)}>
			<div className="min-w-0">
				<label
					htmlFor={id}
					className={cx(
						"block type-body font-semibold text-ink",
						disabled ? "cursor-not-allowed" : "cursor-pointer"
					)}>
					{label}
				</label>
				{description && (
					<p id={descriptionId} className="type-small text-ink-2">
						{description}
					</p>
				)}
			</div>
			<div className="flex shrink-0 items-center gap-3">
				{/* The switch role already announces on and off; the word is for sighted readers. */}
				{showWord && (
					<span aria-hidden="true" className="type-small font-semibold text-ink">
						{checked ? "On" : "Off"}
					</span>
				)}
				<SwitchPrimitive.Root
					id={id}
					checked={checked}
					onCheckedChange={onCheckedChange}
					disabled={disabled}
					name={name}
					aria-describedby={descriptionId}
					className={cx(
						/* 52 × 32 track; ::after widens the target to 44 px tall. */
						"relative inline-flex h-8 w-13 shrink-0 items-center rounded-pill border-2 border-ink bg-island",
						"after:absolute after:-inset-1.5",
						"transition-[background-color] duration-(--ct-duration-quick) ease-standard",
						"not-disabled:hover:bg-well data-[state=checked]:bg-ink disabled:cursor-not-allowed"
					)}>
					<SwitchPrimitive.Thumb
						className={cx(
							"block size-6 translate-x-0.5 rounded-pill bg-ink",
							"transition-[translate,background-color] duration-(--ct-duration-base) ease-standard",
							"data-[state=checked]:translate-x-5.5 data-[state=checked]:bg-on-ink"
						)}
					/>
				</SwitchPrimitive.Root>
			</div>
		</div>
	);
}
