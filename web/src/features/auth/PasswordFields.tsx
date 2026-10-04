"use client";

import type { Ref } from "react";
import { useState } from "react";

import { Field } from "@/components/contour/Field";
import { PasswordInput } from "@/components/contour/PasswordInput";
import { TextInput } from "@/components/contour/TextInput";

import { MIN_PASSWORD_LENGTH } from "./params";

export type PasswordFieldsProps = {
	passwordId: string;
	confirmId: string;
	passwordLabel: string;
	confirmLabel: string;
	/** The rule beside the live count: "Use at least 12." on sign-up, "At least 12." on reset (Org 7, Org 10). */
	rule: string;
	password: string;
	confirm: string;
	onPasswordChange: (value: string) => void;
	onConfirmChange: (value: string) => void;
	/** An error from submitting, which replaces the live check until the field changes. */
	passwordError?: string;
	confirmError?: string;
	passwordRef?: Ref<HTMLInputElement>;
	confirmRef?: Ref<HTMLInputElement>;
	disabled?: boolean;
};

/** "16 characters" in the saved check once long enough, otherwise the count and the rule in secondary ink. */
function lengthCheck(length: number, rule: string) {
	if (length >= MIN_PASSWORD_LENGTH) return { success: `${length} characters`, hint: rule };
	if (length === 0) return { success: undefined, hint: rule };
	return {
		success: undefined,
		hint: (
			<>
				<span className="mr-2">{length === 1 ? "1 character" : `${length} characters`}</span>
				{rule}
			</>
		)
	};
}

/**
 * A new password and its confirmation, with the live checks Contour asks for (DESIGN.md §5, §10):
 * the length updates as you type, and "Does not match yet" waits until the confirmation loses focus
 * or is as long as the password, so nobody is told off mid-word.
 */
export function PasswordFields({
	passwordId,
	confirmId,
	passwordLabel,
	confirmLabel,
	rule,
	password,
	confirm,
	onPasswordChange,
	onConfirmChange,
	passwordError,
	confirmError,
	passwordRef,
	confirmRef,
	disabled
}: PasswordFieldsProps) {
	const [confirmLeft, setConfirmLeft] = useState(false);
	const length = lengthCheck(password.length, rule);

	const matches = confirm.length > 0 && confirm === password;
	const mismatchShown = confirm.length > 0 && !matches && (confirmLeft || confirm.length >= password.length);

	return (
		<>
			<Field
				label={passwordLabel}
				htmlFor={passwordId}
				error={passwordError}
				success={length.success}
				hint={length.hint}>
				<PasswordInput
					ref={passwordRef}
					name="new-password"
					autoComplete="new-password"
					value={password}
					disabled={disabled}
					onChange={event => onPasswordChange(event.currentTarget.value)}
				/>
			</Field>
			<Field
				label={confirmLabel}
				htmlFor={confirmId}
				error={confirmError ?? (mismatchShown ? "Does not match yet" : undefined)}
				success={matches ? "Passwords match" : undefined}>
				<TextInput
					ref={confirmRef}
					type="password"
					name="confirm-password"
					autoComplete="new-password"
					autoCapitalize="none"
					autoCorrect="off"
					spellCheck={false}
					value={confirm}
					disabled={disabled}
					onChange={event => onConfirmChange(event.currentTarget.value)}
					onBlur={() => setConfirmLeft(true)}
				/>
			</Field>
		</>
	);
}
