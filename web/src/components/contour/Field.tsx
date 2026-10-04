"use client";

import { createContext, type ReactNode, useContext, useLayoutEffect, useMemo, useState } from "react";

import { cx } from "@/lib/cx";

import { Icon } from "./Icon";

/** The ids a field's parts carry. They derive from the control's id, so a control and its messages always pair up. */
export function useFieldIds(id: string) {
	return useMemo(
		() => ({
			hint: `${id}-hint`,
			error: `${id}-error`,
			success: `${id}-success`,
			counter: `${id}-counter`
		}),
		[id]
	);
}

type FieldContextValue = {
	id: string;
	describedBy: string | undefined;
	invalid: boolean;
	setCounter: (counter: ReactNode) => void;
};

const FieldContext = createContext<FieldContextValue | null>(null);

function joinIds(...ids: (string | false | undefined)[]): string | undefined {
	return ids.filter(Boolean).join(" ") || undefined;
}

function hasContent(node: ReactNode): boolean {
	return node !== undefined && node !== null && node !== false && node !== "";
}

/**
 * What a control inside a Field takes from it: the id the label points at, the messages that describe it,
 * and whether the field shows an error. A control's own props win; describedBy lists are joined.
 */
export function useFieldControl({
	id,
	invalid,
	describedBy
}: {
	id?: string;
	invalid?: boolean;
	describedBy?: string;
}) {
	const field = useContext(FieldContext);
	return {
		id: id ?? field?.id,
		invalid: invalid ?? field?.invalid ?? false,
		describedBy: joinIds(field?.describedBy, describedBy)
	};
}

/**
 * Shows a control's own count (a Textarea's "69 / 1000") in the field's row, on the right. Returns false
 * outside a Field, where the control shows the count itself. Pass null when there is nothing to count.
 */
export function useFieldCounter(count: string | null): boolean {
	const setCounter = useContext(FieldContext)?.setCounter;
	useLayoutEffect(() => {
		if (!setCounter || count === null) return;
		setCounter(count);
		return () => setCounter(null);
	}, [setCounter, count]);
	return Boolean(setCounter);
}

export type FieldProps = {
	label: ReactNode;
	/** The control's id. The hint, error, success and counter ids derive from it (see useFieldIds). */
	htmlFor: string;
	/** Guidance in secondary ink. It stays beside an error or success message. */
	hint?: ReactNode;
	/** What is needed, beside the attention triangle. Marks the control invalid. */
	error?: ReactNode;
	/** A passing live check, such as "16 characters" or "Passwords match", beside the saved check. */
	success?: ReactNode;
	optional?: boolean;
	/** Mono text on the right of the message row, such as codeCounter's "4 of 6". */
	counter?: ReactNode;
	className?: string;
	children: ReactNode;
};

/**
 * A label, its control, and one message row: the error or success message and the hint on the left, a
 * counter on the right. Controls inside take the id, aria-describedby and aria-invalid from the field.
 * The error and success messages sit in a polite live region, so a live check is announced as it changes.
 */
export function Field({
	label,
	htmlFor,
	hint,
	error,
	success,
	optional = false,
	counter,
	className,
	children
}: FieldProps) {
	const ids = useFieldIds(htmlFor);
	const [controlCounter, setControlCounter] = useState<ReactNode>(null);
	const shownCounter = hasContent(counter) ? counter : controlCounter;

	const showError = hasContent(error);
	const showSuccess = !showError && hasContent(success);
	const showHint = hasContent(hint);
	const showCounter = hasContent(shownCounter);

	const describedBy = joinIds(
		showError && ids.error,
		showSuccess && ids.success,
		showHint && ids.hint,
		showCounter && ids.counter
	);
	const context = useMemo<FieldContextValue>(
		() => ({ id: htmlFor, describedBy, invalid: showError, setCounter: setControlCounter }),
		[htmlFor, describedBy, showError]
	);

	return (
		<div className={cx("flex flex-col", className)}>
			<label htmlFor={htmlFor} className="mb-2 type-small font-semibold text-ink">
				{label}
				{optional && <span className="font-normal text-ink-2"> (optional)</span>}
			</label>
			<FieldContext value={context}>{children}</FieldContext>
			<div
				className={cx(
					"flex items-start justify-between gap-4 type-small",
					(showError || showSuccess || showHint || showCounter) && "mt-2"
				)}>
				<div className="min-w-0">
					<span aria-live="polite">
						{showError && (
							<span
								id={ids.error}
								className="mr-2 inline-flex items-start gap-1.5 font-semibold text-attention">
								<Icon name="triangle-alert" size={16} className="mt-0.5 shrink-0" />
								<span>{error}</span>
							</span>
						)}
						{showSuccess && (
							<span
								id={ids.success}
								className="mr-2 inline-flex items-start gap-1.5 font-semibold text-saved">
								<Icon name="check" size={16} className="mt-0.5 shrink-0" />
								<span>{success}</span>
							</span>
						)}
					</span>
					{showHint && (
						<span id={ids.hint} className="text-ink-2">
							{hint}
						</span>
					)}
				</div>
				{showCounter && (
					<span id={ids.counter} className="shrink-0 type-mono-data text-ink-2 tnum">
						{shownCounter}
					</span>
				)}
			</div>
		</div>
	);
}
