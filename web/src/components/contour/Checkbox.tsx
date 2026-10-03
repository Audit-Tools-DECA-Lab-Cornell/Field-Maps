"use client";

import { Checkbox as CheckboxPrimitive } from "radix-ui";
import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

import { Icon } from "./Icon";

export type CheckboxProps = {
	id: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	/** The label. It wraps beside the box, and pressing it toggles the box. */
	children: ReactNode;
	/** A line of secondary ink under the label, linked to the box by aria-describedby. */
	description?: ReactNode;
	disabled?: boolean;
	/** Form submission: the box posts `name=value` (default "on") while checked. */
	name?: string;
	value?: string;
	required?: boolean;
	className?: string;
};

/**
 * A 22 px box with a 2 px ink edge, filled with ink and a check when on. The box keeps a 44 px target;
 * its label is part of the target too.
 */
export function Checkbox({
	id,
	checked,
	onCheckedChange,
	children,
	description,
	disabled = false,
	name,
	value,
	required,
	className
}: CheckboxProps) {
	const descriptionId = description ? `${id}-description` : undefined;

	return (
		<div className={cx("flex items-start gap-3", disabled && "opacity-50", className)}>
			<CheckboxPrimitive.Root
				id={id}
				checked={checked}
				onCheckedChange={next => onCheckedChange(next === true)}
				disabled={disabled}
				name={name}
				value={value}
				required={required}
				aria-describedby={descriptionId}
				className={cx(
					/* A 22 px box with 6 px corners (smaller than any Contour radius); ::after widens the target to 44 px.
					   One pixel down sits it on the label's first line. */
					"relative mt-px flex size-5.5 shrink-0 items-center justify-center rounded-[6px] border-2 border-ink bg-island text-on-ink",
					"after:absolute after:-inset-2.75",
					"transition-[background-color] duration-(--ct-duration-quick) ease-standard",
					"not-disabled:hover:bg-well data-[state=checked]:bg-ink disabled:cursor-not-allowed"
				)}>
				<CheckboxPrimitive.Indicator className="flex">
					<Icon name="check" size={14} strokeWidth={3} />
				</CheckboxPrimitive.Indicator>
			</CheckboxPrimitive.Root>
			<div className="min-w-0">
				<label
					htmlFor={id}
					className={cx("type-body text-ink", disabled ? "cursor-not-allowed" : "cursor-pointer")}>
					{children}
				</label>
				{description && (
					<p id={descriptionId} className="type-small text-ink-2">
						{description}
					</p>
				)}
			</div>
		</div>
	);
}
