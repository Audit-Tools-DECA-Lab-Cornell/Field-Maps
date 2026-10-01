"use client";

/**
 * A segmented choice, the same shape as the Form Studio's own rule-mode control: a tinted track,
 * the current option carrying the accent tint and an underline. Every option stays at least 44 px
 * tall, since this is the one control in the flow a thumb has to land on precisely.
 */
export function Segmented<T extends string | number>({
	label,
	value,
	options,
	onChange
}: {
	readonly label: string;
	readonly value: T;
	readonly options: readonly { readonly value: T; readonly label: string }[];
	readonly onChange: (value: T) => void;
}) {
	return (
		<div
			role="radiogroup"
			aria-label={label}
			className="inline-flex flex-wrap gap-hair rounded-md bg-neutral-900 p-hair">
			{options.map(option => (
				<button
					key={option.value}
					type="button"
					role="radio"
					aria-checked={option.value === value}
					onClick={() => onChange(option.value)}
					className={`min-h-11 rounded-sm px-loose text-caption transition-colors duration-100 [touch-action:manipulation] ${
						option.value === value
							? "bg-accent-800 text-accent-100 shadow-[inset_0_-2px_0_var(--color-accent-400)]"
							: "text-neutral-400 hover:bg-ink-tint hover:text-neutral-200"
					}`}>
					{option.label}
				</button>
			))}
		</div>
	);
}
