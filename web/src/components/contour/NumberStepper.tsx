"use client";

import { type KeyboardEvent, type MouseEvent, useId } from "react";

import { cx } from "@/lib/cx";

import { useFieldControl } from "./Field";
import { Icon, type IconName } from "./Icon";

export type NumberStepperProps = {
	value: number;
	onChange: (value: number) => void;
	min: number;
	max: number;
	/** Names the value for assistive technology and the buttons ("Increase rounds per zone"). */
	label: string;
	step?: number;
	/** Defaults to the enclosing Field's id. */
	id?: string;
	disabled?: boolean;
	className?: string;
};

/** Keeps focus where it is when a button is pressed with a pointer, so it never lands on a button about to disable. */
function keepFocus(event: MouseEvent) {
	event.preventDefault();
}

/**
 * A whole number between bounds, as a pill: − value +. The value is a spinbutton: arrow keys step it,
 * Page Up and Page Down step by ten, Home and End jump to the bounds. The buttons are for pointers and
 * touch and stay out of the tab order, as the spinbutton covers the keyboard.
 */
export function NumberStepper({
	value,
	onChange,
	min,
	max,
	label,
	step = 1,
	id,
	disabled = false,
	className
}: NumberStepperProps) {
	const field = useFieldControl({ id });
	const generatedId = useId();
	const valueId = field.id ?? generatedId;

	function set(next: number) {
		const clamped = Math.min(max, Math.max(min, next));
		if (clamped !== value) onChange(clamped);
	}

	function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		if (disabled) return;
		const targets: Record<string, number> = {
			ArrowUp: value + step,
			ArrowDown: value - step,
			PageUp: value + step * 10,
			PageDown: value - step * 10,
			Home: min,
			End: max
		};
		if (!(event.key in targets)) return;
		event.preventDefault();
		set(targets[event.key]);
	}

	function stepButton(direction: -1 | 1, icon: IconName, name: string) {
		const atBound = direction < 0 ? value <= min : value >= max;
		return (
			<button
				type="button"
				tabIndex={-1}
				aria-label={`${name} ${label}`}
				aria-controls={valueId}
				disabled={disabled || atBound}
				onMouseDown={keepFocus}
				onClick={() => set(value + direction * step)}
				className={cx(
					"flex size-11 shrink-0 items-center justify-center rounded-full text-ink",
					"transition-[background-color,opacity] duration-(--ct-duration-quick) ease-standard",
					"not-disabled:hover:bg-well not-disabled:active:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
				)}>
				<Icon name={icon} />
			</button>
		);
	}

	return (
		<div
			className={cx(
				"inline-flex h-control items-center rounded-pill border border-line bg-island",
				disabled && "opacity-50",
				className
			)}>
			{stepButton(-1, "minus", "Decrease")}
			<div
				id={valueId}
				role="spinbutton"
				tabIndex={disabled ? -1 : 0}
				aria-label={label}
				aria-valuenow={value}
				aria-valuemin={min}
				aria-valuemax={max}
				aria-disabled={disabled || undefined}
				aria-describedby={field.describedBy}
				onKeyDown={handleKeyDown}
				className="flex h-11 min-w-12 items-center justify-center rounded-pill px-1 font-mono text-base font-semibold text-ink tnum">
				{value}
			</div>
			{stepButton(1, "plus", "Increase")}
		</div>
	);
}
