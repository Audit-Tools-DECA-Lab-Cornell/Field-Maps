"use client";

import { RadioGroup } from "radix-ui";
import { type ReactNode, useId } from "react";

import { cx } from "@/lib/cx";

export type RadioRowOption = {
	value: string;
	label: ReactNode;
	/** A line of secondary ink under the label, read after the label as its description. */
	description?: ReactNode;
	disabled?: boolean;
};

export type RadioRowsProps = {
	value: string;
	onValueChange: (value: string) => void;
	options: RadioRowOption[];
	/** Names the group for assistive technology, such as "Zone". */
	label: string;
	/** Form submission: the group posts `name=value` for the chosen row. */
	name?: string;
	required?: boolean;
	disabled?: boolean;
	className?: string;
};

/**
 * A short list of choices as stacked rows, each at least 56 px tall and pressable across its whole width.
 * The chosen row takes the accent's soft fill and edge, with a filled accent ring; the others show a
 * hollow ring. Arrow keys move the choice, as in any radio group.
 */
export function RadioRows({
	value,
	onValueChange,
	options,
	label,
	name,
	required,
	disabled,
	className
}: RadioRowsProps) {
	const baseId = useId();

	return (
		<RadioGroup.Root
			value={value}
			onValueChange={onValueChange}
			aria-label={label}
			name={name}
			required={required}
			disabled={disabled}
			className={cx("flex flex-col gap-3", className)}>
			{options.map((option, index) => {
				const labelId = `${baseId}-${index}-label`;
				const descriptionId = option.description ? `${baseId}-${index}-description` : undefined;
				return (
					<RadioGroup.Item
						key={option.value}
						value={option.value}
						disabled={option.disabled}
						aria-labelledby={labelId}
						aria-describedby={descriptionId}
						className={cx(
							"group flex min-h-14 w-full items-center gap-3 rounded-tile border-2 border-ink bg-island px-4 py-3 text-left text-ink",
							"transition-[background-color,border-color,opacity] duration-(--ct-duration-quick) ease-standard",
							"not-disabled:hover:bg-well not-disabled:active:opacity-90",
							"data-[state=checked]:border-accent data-[state=checked]:bg-accent-soft",
							"disabled:cursor-not-allowed disabled:opacity-50"
						)}>
						<span
							aria-hidden="true"
							className={cx(
								"flex size-5.5 shrink-0 items-center justify-center rounded-pill border-2 border-ink",
								"transition-[background-color,border-color] duration-(--ct-duration-quick) ease-standard",
								"group-data-[state=checked]:border-accent group-data-[state=checked]:bg-accent"
							)}>
							<RadioGroup.Indicator className="size-2 rounded-pill bg-on-accent" />
						</span>
						<span className="min-w-0">
							<span id={labelId} className="block type-answer">
								{option.label}
							</span>
							{option.description && (
								<span id={descriptionId} className="block type-small text-ink-2">
									{option.description}
								</span>
							)}
						</span>
					</RadioGroup.Item>
				);
			})}
		</RadioGroup.Root>
	);
}
