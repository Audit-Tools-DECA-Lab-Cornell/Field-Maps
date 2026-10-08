"use client";

import { type FormEvent, useRef, useState } from "react";

import { Button } from "@/components/contour/Button";
import { Field } from "@/components/contour/Field";
import { TextInput } from "@/components/contour/TextInput";
import { TextLink } from "@/components/contour/TextLink";

import { OfflineNote } from "./OfflineNote";
import { type AuthPreviewState, isEmail, withQuery } from "./params";
import { ServerMessage, useAuthAction } from "./useAuthAction";
import { formatCountdown, useCooldown } from "./useCooldown";

export type ForgotPasswordFormProps = {
	/**
	 * The address's `next`, already made safe by `safeNext`: posted, so the new password continues there,
	 * and kept on the way back to sign in.
	 */
	next: string;
	/** True when the address carried `next`. */
	carryNext: boolean;
	state: AuthPreviewState;
};

/**
 * Reset your password (Org 9). The address goes to the `authenticate` Server Action, which asks Supabase
 * Auth for a recovery code, keeps the address in an httpOnly cookie and continues to the code screen. The
 * same thing happens whether or not the address has an account, so the form cannot be used to look one up.
 */
export function ForgotPasswordForm({ next, carryNext, state: preview }: ForgotPasswordFormProps) {
	const [email, setEmail] = useState("");
	const [error, setError] = useState<string>();
	const emailRef = useRef<HTMLInputElement>(null);
	const cooldown = useCooldown();
	const auth = useAuthAction({ fields: { email: emailRef }, onRetryAfter: cooldown.start });
	const offline = preview === "offline";
	const waiting = cooldown.remaining > 0;

	function submit(event: FormEvent<HTMLFormElement>) {
		if (auth.pending || offline || waiting) return event.preventDefault();
		if (!isEmail(email)) {
			event.preventDefault();
			setError("Enter the email address you signed up with.");
			emailRef.current?.focus();
		}
	}

	return (
		<form
			action={auth.action}
			noValidate
			onSubmit={submit}
			className="flex flex-col gap-5"
			aria-busy={auth.pending || undefined}>
			<input type="hidden" name="intent" value="forgot-password" />
			<input type="hidden" name="next" value={next} />
			{offline && <OfflineNote />}
			<ServerMessage {...auth.note} />
			<Field label="Email address" htmlFor="forgot-email" error={error}>
				<TextInput
					ref={emailRef}
					type="email"
					name="email"
					autoComplete="email"
					autoCapitalize="none"
					autoCorrect="off"
					spellCheck={false}
					maxLength={254}
					autoFocus
					value={email}
					invalid={auth.invalid("email") || undefined}
					aria-describedby={auth.describedBy("email")}
					onChange={event => {
						setEmail(event.currentTarget.value);
						setError(undefined);
						auth.edited();
					}}
				/>
			</Field>
			<Button
				type="submit"
				size="lg"
				fullWidth
				icon="mail"
				busy={auth.pending}
				busyLabel="Sending recovery code…"
				disabled={offline || waiting}
				disabledReason={
					offline
						? "Sending a recovery code needs a connection."
						: `Wait ${formatCountdown(cooldown.remaining)} before trying again.`
				}>
				Send recovery code
			</Button>
			<p className="-mt-2.5 type-body">
				<TextLink
					href={withQuery("/sign-in", { next: carryNext ? next : undefined })}
					arrow="left"
					className="py-2.5">
					Back to sign in
				</TextLink>
			</p>
		</form>
	);
}
