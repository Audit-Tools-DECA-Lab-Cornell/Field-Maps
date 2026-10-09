"use client";

import { type FormEvent, useRef, useState } from "react";

import { Button } from "@/components/contour/Button";
import { CodeCounter } from "@/components/contour/CodeCounter";
import { CodeInput } from "@/components/contour/CodeInput";
import { Field } from "@/components/contour/Field";
import { TextLink } from "@/components/contour/TextLink";

import { MIN_PASSWORD_LENGTH } from "./params";
import { PasswordFields } from "./PasswordFields";
import { ResendCodeForm } from "./ResendCodeForm";
import { asksToStartAgain, ServerMessage, StartAgainLink, useAuthAction } from "./useAuthAction";
import { formatCountdown, useCooldown } from "./useCooldown";

const CODE_LENGTH = 6;

/** Where a recovery starts over: the address goes in again. */
const START_AGAIN_HREF = "/forgot-password";

export type ResetPasswordFormProps = {
	/** Where the account continues once the password is saved, already made safe by `safeNext`. */
	next: string;
	/** Seconds until another code may be sent, from the `fm-email-sent` cookie. */
	cooldownSeconds: number;
};

/** Why "Save new password" is off, naming the first thing still missing, top to bottom. */
function disabledReason(code: string, password: string, confirm: string, wait: number): string | undefined {
	if (wait > 0) return `Wait ${formatCountdown(wait)} before trying again.`;
	if (code.length < CODE_LENGTH) return "The button turns on when all six digits of the code are in.";
	if (password.length < MIN_PASSWORD_LENGTH)
		return "The button turns on when the new password has at least 8 characters.";
	if (confirm !== password) return "The button turns on when both passwords match.";
	return undefined;
}

/**
 * Choose a new password (Org 10). The save stays off, with its reason under it, until the code is in and
 * both passwords match. The code and the new password then go to the `authenticate` Server Action, which
 * checks the recovery code against the address kept in an httpOnly cookie, saves the password with
 * Supabase Auth and continues to `next`. A wrong code reselects the field; a refused password keeps the
 * code, so a second try needs no new email.
 */
export function ResetPasswordForm({ next, cooldownSeconds }: ResetPasswordFormProps) {
	const [code, setCode] = useState("");
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const codeRef = useRef<HTMLInputElement>(null);
	const passwordRef = useRef<HTMLInputElement>(null);
	const cooldown = useCooldown();
	const auth = useAuthAction({ fields: { code: codeRef, password: passwordRef }, onRetryAfter: cooldown.start });
	const reason = disabledReason(code, password, confirm, cooldown.remaining);

	function submit(event: FormEvent<HTMLFormElement>) {
		if (auth.pending || reason) event.preventDefault();
	}

	return (
		<div className="flex flex-col gap-5">
			<form
				action={auth.action}
				noValidate
				onSubmit={submit}
				className="flex flex-col gap-5"
				aria-busy={auth.pending || undefined}>
				<input type="hidden" name="intent" value="reset-password" />
				<input type="hidden" name="next" value={next} />
				<ServerMessage {...auth.note}>
					{asksToStartAgain(auth.state) && <StartAgainLink href={START_AGAIN_HREF} />}
				</ServerMessage>
				<Field
					label="Six-digit recovery code"
					htmlFor="reset-code"
					counter={<CodeCounter value={code} length={CODE_LENGTH} />}>
					<CodeInput
						ref={codeRef}
						id="reset-code"
						name="code"
						length={CODE_LENGTH}
						kind="otp"
						value={code}
						autoFocus
						invalid={auth.invalid("code") || undefined}
						aria-describedby={auth.describedBy("code")}
						onChange={value => {
							setCode(value);
							auth.edited();
						}}
					/>
				</Field>
				<PasswordFields
					passwordId="reset-password"
					confirmId="reset-confirm"
					passwordLabel="New password"
					confirmLabel="Confirm new password"
					password={password}
					confirm={confirm}
					onPasswordChange={value => {
						setPassword(value);
						auth.edited();
					}}
					onConfirmChange={setConfirm}
					passwordInvalid={auth.invalid("password")}
					passwordDescribedBy={auth.describedBy("password")}
					passwordRef={passwordRef}
				/>
				<Button
					type="submit"
					size="lg"
					fullWidth
					icon="lock"
					busy={auth.pending}
					busyLabel="Saving new password…"
					disabled={Boolean(reason)}
					disabledReason={reason}>
					Save new password
				</Button>
			</form>
			<ResendCodeForm
				kind="reset-password"
				cooldownSeconds={cooldownSeconds}
				codeRef={codeRef}
				startAgainHref={START_AGAIN_HREF}
			/>
			<p className="-mt-2.5 type-body">
				<TextLink href={START_AGAIN_HREF} arrow={false} className="inline-flex min-h-touch items-center">
					Use a different email address
				</TextLink>
			</p>
		</div>
	);
}
