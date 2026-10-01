import type { ReactNode } from "react";

/** A labelled field with room for an inline error or a quiet hint underneath — never both at once. */
export function Field({
	label,
	htmlFor,
	error,
	hint,
	children
}: {
	readonly label: string;
	readonly htmlFor: string;
	readonly error?: string;
	readonly hint?: string;
	readonly children: ReactNode;
}) {
	return (
		<div className="min-w-0">
			<label htmlFor={htmlFor} className="mb-tight block text-meta text-neutral-400">
				{label}
			</label>
			{children}
			{error !== undefined ? (
				<p role="alert" className="mt-tight text-micro text-attention-text">
					{error}
				</p>
			) : (
				hint !== undefined && <p className="mt-tight text-micro text-neutral-600">{hint}</p>
			)}
		</div>
	);
}
