"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState, useTransition } from "react";

import { Button } from "@/components/contour/Button";
import { CodeCounter } from "@/components/contour/CodeCounter";
import { CodeInput } from "@/components/contour/CodeInput";
import { Field } from "@/components/contour/Field";
import { useToast } from "@/components/contour/Toast";

import { OfflineNote } from "./OfflineNote";
import { type AuthPreviewState, MIN_PASSWORD_LENGTH, withQuery, WRONG_CODE_DEMO } from "./params";
import { PasswordFields } from "./PasswordFields";

const CODE_LENGTH = 6;

export type ResetPasswordFormProps = {
	email?: string;
	state: AuthPreviewState;
};

/** Why "Save new password" is off, naming the first thing still missing, top to bottom. */
function disabledReason(code: string, password: string, confirm: string, offline: boolean): string | undefined {
	if (offline) return "Saving a new password needs a connection.";
	if (code.length < CODE_LENGTH) return "The button turns on when all six digits of the code are in.";
	if (password.length < MIN_PASSWORD_LENGTH)
		return "The button turns on when the new password has at least 12 characters.";
	if (confirm !== password) return "The button turns on when both passwords match.";
	return undefined;
}

/**
 * Choose a new password (Org 10). The save stays off, with its reason under it, until the code is in and
 * both passwords match. In this preview nothing is saved: the toast says so and the page returns to sign in.
 */
export function ResetPasswordForm({ email, state }: ResetPasswordFormProps) {
	const router = useRouter();
	const { toast } = useToast();
	const [code, setCode] = useState("");
	const [codeError, setCodeError] = useState<string>();
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [pending, startTransition] = useTransition();
	const codeRef = useRef<HTMLInputElement>(null);
	const offline = state === "offline";
	const reason = disabledReason(code, password, confirm, offline);

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (pending || reason) return;
		if (code === WRONG_CODE_DEMO) {
			setCodeError("That code did not match. Check the latest email and try again.");
			requestAnimationFrame(() => {
				codeRef.current?.focus();
				codeRef.current?.select();
			});
			return;
		}
		toast({ title: "Preview · No password was changed", description: "Sign in to continue." });
		startTransition(() => router.push(withQuery("/sign-in", { email })));
	}

	return (
		<form noValidate onSubmit={submit} className="flex flex-col gap-5" aria-busy={pending || undefined}>
			{offline && <OfflineNote />}
			<Field
				label="Six-digit recovery code"
				htmlFor="reset-code"
				error={codeError}
				counter={<CodeCounter value={code} length={CODE_LENGTH} />}>
				<CodeInput
					ref={codeRef}
					id="reset-code"
					name="code"
					length={CODE_LENGTH}
					kind="otp"
					value={code}
					autoFocus
					onChange={value => {
						setCode(value);
						setCodeError(undefined);
					}}
				/>
			</Field>
			<PasswordFields
				passwordId="reset-password"
				confirmId="reset-confirm"
				passwordLabel="New password"
				confirmLabel="Confirm new password"
				rule="At least 12."
				password={password}
				confirm={confirm}
				onPasswordChange={setPassword}
				onConfirmChange={setConfirm}
			/>
			<Button
				type="submit"
				size="lg"
				fullWidth
				icon="lock"
				busy={pending}
				disabled={Boolean(reason)}
				disabledReason={reason}>
				Save new password
			</Button>
		</form>
	);
}
