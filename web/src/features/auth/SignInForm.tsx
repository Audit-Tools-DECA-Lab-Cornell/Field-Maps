"use client";

import { type FormEvent, useRef, useState } from "react";

import { Button } from "@/components/contour/Button";
import { Field } from "@/components/contour/Field";
import { PasswordInput } from "@/components/contour/PasswordInput";
import { TextInput } from "@/components/contour/TextInput";
import { TextLink } from "@/components/contour/TextLink";
import type { AuthState } from "@/lib/auth/actions";

import { OfflineNote } from "./OfflineNote";
import { type AuthPreviewState, isEmail, MAX_PASSWORD_LENGTH, withQuery } from "./params";
import { NO_MESSAGE, ServerMessage, useAuthAction } from "./useAuthAction";
import { formatCountdown, useCooldown } from "./useCooldown";

type Errors = { email?: string; password?: string };

export type SignInFormProps = {
	/** Where a signed-in reader continues, already made safe by `safeNext`. */
	next: string;
	/** True when the address carried `next`, so the links to the other auth pages keep it. */
	carryNext: boolean;
	state: AuthPreviewState;
};

/** The preview's sample answer for `?preview-state=error`, word for word what the server says. */
const PREVIEW_ERROR: AuthState = { message: "The email or password is incorrect." };

/**
 * Sign in (Org 6). The checks run here first; the email and password then go to the `authenticate`
 * Server Action, which signs in with Supabase Auth and continues to `next`. An unconfirmed account gets
 * the server's message and a way to enter its code; a rate limit turns the button off until it passes.
 */
export function SignInForm({ next, carryNext, state: preview }: SignInFormProps) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [errors, setErrors] = useState<Errors>({});
	const emailRef = useRef<HTMLInputElement>(null);
	const passwordRef = useRef<HTMLInputElement>(null);
	const cooldown = useCooldown();
	const auth = useAuthAction({
		initial: preview === "error" ? PREVIEW_ERROR : NO_MESSAGE,
		fields: { email: emailRef, password: passwordRef },
		onRetryAfter: cooldown.start
	});
	const offline = preview === "offline";
	const waiting = cooldown.remaining > 0;
	const nextQuery = { next: carryNext ? next : undefined };

	function submit(event: FormEvent<HTMLFormElement>) {
		const found: Errors = {
			email: isEmail(email) ? undefined : "Enter the email address you signed up with.",
			password: password.length > 0 ? undefined : "Enter your password."
		};
		setErrors(found);
		if (auth.pending || offline || waiting || found.email || found.password) event.preventDefault();
		if (found.email) emailRef.current?.focus();
		else if (found.password) passwordRef.current?.focus();
	}

	return (
		<form
			action={auth.action}
			noValidate
			onSubmit={submit}
			className="flex flex-col gap-5"
			aria-busy={auth.pending || undefined}>
			<input type="hidden" name="intent" value="sign-in" />
			<input type="hidden" name="next" value={next} />
			{offline && <OfflineNote />}
			<ServerMessage {...auth.note}>
				{auth.state.verify && (
					<>
						{" "}
						<TextLink href={withQuery("/verify", { next })}>Enter verification code</TextLink>
					</>
				)}
			</ServerMessage>
			<Field label="Email address" htmlFor="sign-in-email" error={errors.email}>
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
						setErrors(current => ({ ...current, email: undefined }));
						auth.edited();
					}}
				/>
			</Field>
			<Field label="Password" htmlFor="sign-in-password" error={errors.password}>
				<PasswordInput
					ref={passwordRef}
					name="password"
					autoComplete="current-password"
					maxLength={MAX_PASSWORD_LENGTH}
					value={password}
					invalid={auth.invalid("password") || undefined}
					aria-describedby={auth.describedBy("password")}
					onChange={event => {
						setPassword(event.currentTarget.value);
						setErrors(current => ({ ...current, password: undefined }));
						auth.edited();
					}}
				/>
			</Field>
			<Button
				type="submit"
				size="lg"
				fullWidth
				iconRight="arrow-right"
				busy={auth.pending}
				disabled={offline || waiting}
				disabledReason={
					offline
						? "Signing in needs a connection."
						: `Wait ${formatCountdown(cooldown.remaining)} before trying again.`
				}>
				{/* A full-width button keeps its width anyway, so the label swaps without the primitive's
				    reserved busy width, which would push the arrow away from "Sign in" at rest. */}
				{auth.pending ? "Signing in…" : "Sign in"}
			</Button>
			<div className="-mt-2.5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 type-body">
				<TextLink
					href={withQuery("/forgot-password", nextQuery)}
					arrow={false}
					className="inline-flex min-h-touch items-center">
					Forgot password?
				</TextLink>
				<TextLink
					href={withQuery("/sign-up", nextQuery)}
					arrow={false}
					className="inline-flex min-h-touch items-center">
					Create account
				</TextLink>
			</div>
		</form>
	);
}
