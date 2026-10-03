"use client";

import {
	type ChangeEvent,
	type ClipboardEvent,
	type ComponentPropsWithRef,
	type Ref,
	useCallback,
	useLayoutEffect,
	useRef
} from "react";

import { cx } from "@/lib/cx";

import { controlFrame, useFieldControl } from "./Field";

/** `otp` is the six-digit email code; `join` is a project join code of capital letters and digits. */
export type CodeKind = "otp" | "join";

export type CodeInputProps = Omit<
	ComponentPropsWithRef<"input">,
	"id" | "value" | "defaultValue" | "onChange" | "type" | "inputMode" | "autoComplete" | "maxLength" | "pattern"
> & {
	id: string;
	length: 6 | 8;
	kind: CodeKind;
	value: string;
	/** Receives the cleaned code: no spaces, hyphens or other characters, never longer than `length`. */
	onChange: (value: string) => void;
	/** Called when a change makes the code full length, typed or pasted. */
	onComplete?: (value: string) => void;
	invalid?: boolean;
	autoFocus?: boolean;
};

/** How much of a code is in: "4 of 6". Pass it to the Field's counter. */
export function codeCounter(value: string, length: number): string {
	return `${Math.min(value.length, length)} of ${length}`;
}

/**
 * Keeps only what a code can hold: digits for `otp`; capital letters and digits for `join`. Spaces,
 * hyphens and anything else go, and full-width characters fold to ASCII, so "482 913" and "deca-2026" work.
 */
export function cleanCode(raw: string, kind: CodeKind): string {
	const text = raw.normalize("NFKC");
	return kind === "otp" ? text.replace(/[^0-9]/g, "") : text.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
	if (typeof ref === "function") ref(value);
	else if (ref) ref.current = value;
}

/**
 * One wide field for a whole code, never a row of boxes: it takes a paste, a password manager or the
 * phone's one-time-code suggestion in one go, and reads as one value to a screen reader. The code is
 * cleaned as it is typed or pasted; the caret stays where the person put it.
 */
export function CodeInput({
	ref,
	id,
	length,
	kind,
	value,
	onChange,
	onComplete,
	invalid,
	className,
	onPaste,
	"aria-describedby": describedBy,
	...props
}: CodeInputProps) {
	const field = useFieldControl({ id, invalid, describedBy });
	const inputRef = useRef<HTMLInputElement | null>(null);
	const pendingCaret = useRef<number | null>(null);

	const setInput = useCallback(
		(node: HTMLInputElement | null) => {
			inputRef.current = node;
			assignRef(ref, node);
		},
		[ref]
	);

	// Cleaning the value rewrites the input, which would send the caret to the end.
	useLayoutEffect(() => {
		const input = inputRef.current;
		const caret = pendingCaret.current;
		pendingCaret.current = null;
		if (input && caret !== null && document.activeElement === input) input.setSelectionRange(caret, caret);
	}, [value]);

	function commit(next: string, caret: number) {
		pendingCaret.current = caret;
		onChange(next);
		if (next.length === length && next !== value) onComplete?.(next);
	}

	function handleChange(event: ChangeEvent<HTMLInputElement>) {
		const input = event.currentTarget;
		const caret = input.selectionStart ?? input.value.length;
		const next = cleanCode(input.value, kind).slice(0, length);
		commit(next, Math.min(cleanCode(input.value.slice(0, caret), kind).length, next.length));
	}

	// A pasted full code replaces what is there; a shorter paste inserts at the caret as usual.
	function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
		onPaste?.(event);
		if (event.defaultPrevented) return;
		const pasted = cleanCode(event.clipboardData.getData("text"), kind);
		if (pasted.length < length) return;
		event.preventDefault();
		const next = pasted.slice(0, length);
		commit(next, next.length);
	}

	return (
		<input
			ref={setInput}
			id={id}
			type="text"
			value={value}
			onChange={handleChange}
			onPaste={handlePaste}
			inputMode={kind === "otp" ? "numeric" : "text"}
			pattern={kind === "otp" ? "[0-9]*" : undefined}
			autoComplete={kind === "otp" ? "one-time-code" : "off"}
			autoCapitalize={kind === "otp" ? "none" : "characters"}
			autoCorrect="off"
			spellCheck={false}
			aria-invalid={field.invalid || undefined}
			aria-describedby={field.describedBy}
			className={cx(
				controlFrame({ invalid: field.invalid }),
				// The mono code style (weight, wide tracking) at the 30 px the auth screens draw it.
				"h-16 px-4 text-center type-mono-code text-3xl",
				className
			)}
			{...props}
		/>
	);
}
