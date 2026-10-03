"use client";

import { type Ref, useCallback, useLayoutEffect, useRef, useState } from "react";

import { useFieldControl } from "./Field";
import { TextInput, type TextInputProps } from "./TextInput";

export type PasswordInputProps = Omit<TextInputProps, "type" | "trailing">;

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
	if (typeof ref === "function") ref(value);
	else if (ref) ref.current = value;
}

/**
 * A TextInput with a Show / Hide button inside its end. The button is a toggle (aria-pressed) whose name
 * stays "Show password"; a pointer press leaves focus and the caret in the field. Pass `autoComplete`
 * ("current-password" or "new-password") so password managers fill the right field.
 */
export function PasswordInput({ ref, id, disabled, readOnly, ...props }: PasswordInputProps) {
	const [visible, setVisible] = useState(false);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const pendingSelection = useRef<[number, number] | null>(null);
	const inputId = useFieldControl({ id }).id;

	const setInput = useCallback(
		(node: HTMLInputElement | null) => {
			inputRef.current = node;
			assignRef(ref, node);
		},
		[ref]
	);

	// Changing the input's type can drop the selection; put the caret back where it was.
	useLayoutEffect(() => {
		const input = inputRef.current;
		const selection = pendingSelection.current;
		pendingSelection.current = null;
		if (input && selection) input.setSelectionRange(selection[0], selection[1]);
	}, [visible]);

	function toggle() {
		const input = inputRef.current;
		if (input && document.activeElement === input) {
			const end = input.value.length;
			pendingSelection.current = [input.selectionStart ?? end, input.selectionEnd ?? end];
		}
		setVisible(shown => !shown);
	}

	return (
		<TextInput
			ref={setInput}
			id={id}
			type={visible ? "text" : "password"}
			disabled={disabled}
			readOnly={readOnly}
			autoCapitalize="none"
			autoCorrect="off"
			spellCheck={false}
			{...props}
			trailing={
				<button
					type="button"
					aria-label="Show password"
					aria-pressed={visible}
					aria-controls={inputId}
					disabled={disabled}
					onMouseDown={event => event.preventDefault()}
					onClick={toggle}
					className="min-h-touch rounded-input px-3 text-base font-semibold text-accent transition-[background-color,opacity] duration-(--ct-duration-quick) ease-standard not-disabled:hover:bg-accent-soft not-disabled:active:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
					{visible ? "Hide" : "Show"}
				</button>
			}
		/>
	);
}
