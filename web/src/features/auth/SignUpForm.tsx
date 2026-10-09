"use client";

import { type FormEvent, useRef, useState } from "react";

import { Button } from "@/components/contour/Button";
import { Checkbox } from "@/components/contour/Checkbox";
import { Field } from "@/components/contour/Field";
import { Icon } from "@/components/contour/Icon";
import { TextInput } from "@/components/contour/TextInput";
import { TextLink } from "@/components/contour/TextLink";

import { isEmail, MIN_PASSWORD_LENGTH, withQuery } from "./params";
import { PasswordFields } from "./PasswordFields";
import { ServerMessage, useAuthAction } from "./useAuthAction";
import { formatCountdown, useCooldown } from "./useCooldown";

type Errors = { email?: string; password?: string; confirm?: string; privacy?: string };

export type SignUpFormProps = {
	/** Where the account continues once its email is verified, already made safe by `safeNext`. */
	next: string;
	/** True when the address carried `next`, so the link back to sign in keeps it. */
	carryNext: boolean;
};

/**
 * Create your account (Org 7). The checks run here first; the email and password then go to the
 * `authenticate` Server Action, which creates the account with Supabase Auth, keeps the address in an
 * httpOnly cookie (never the URL) and continues to the code screen.
 */
export function SignUpForm({ next, carryNext }: SignUpFormProps) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [privacy, setPrivacy] = useState(false);
	const [errors, setErrors] = useState<Errors>({});
	const emailRef = useRef<HTMLInputElement>(null);
	const passwordRef = useRef<HTMLInputElement>(null);
	const confirmRef = useRef<HTMLInputElement>(null);
	const cooldown = useCooldown();
	const auth = useAuthAction({ fields: { email: emailRef, password: passwordRef }, onRetryAfter: cooldown.start });
	const waiting = cooldown.remaining > 0;

	function submit(event: FormEvent<HTMLFormElement>) {
		const found: Errors = {
			email: isEmail(email) ? undefined : "Enter your email address.",
			password: password.length >= MIN_PASSWORD_LENGTH ? undefined : "Use at least 8 characters.",
			confirm:
				confirm.length === 0
					? "Enter the same password again."
					: confirm !== password
						? "Does not match yet"
						: undefined,
			privacy: privacy ? undefined : "Confirm that you have read the privacy information."
		};
		setErrors(found);
		const invalid = Object.values(found).some(Boolean);
		if (auth.pending || waiting || invalid) event.preventDefault();
		if (found.email) emailRef.current?.focus();
		else if (found.password) passwordRef.current?.focus();
		else if (found.confirm) confirmRef.current?.focus();
		else if (found.privacy) document.getElementById("sign-up-privacy")?.focus();
	}

	return (
		<form
			action={auth.action}
			noValidate
			onSubmit={submit}
			className="flex flex-col gap-5"
			aria-busy={auth.pending || undefined}>
			<input type="hidden" name="intent" value="sign-up" />
			<input type="hidden" name="next" value={next} />
			<ServerMessage {...auth.note} />
			<Field label="Email address" htmlFor="sign-up-email" error={errors.email}>
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
			<PasswordFields
				passwordId="sign-up-password"
				confirmId="sign-up-confirm"
				passwordLabel="Password"
				confirmLabel="Confirm password"
				password={password}
				confirm={confirm}
				onPasswordChange={value => {
					setPassword(value);
					setErrors(current => ({ ...current, password: undefined, confirm: undefined }));
					auth.edited();
				}}
				onConfirmChange={value => {
					setConfirm(value);
					setErrors(current => ({ ...current, confirm: undefined }));
				}}
				passwordError={errors.password}
				confirmError={errors.confirm}
				passwordInvalid={auth.invalid("password")}
				passwordDescribedBy={auth.describedBy("password")}
				passwordRef={passwordRef}
				confirmRef={confirmRef}
			/>
			<Checkbox
				id="sign-up-privacy"
				name="privacy"
				checked={privacy}
				onCheckedChange={checked => {
					setPrivacy(checked);
					setErrors(current => ({ ...current, privacy: undefined }));
				}}
				description={
					errors.privacy && (
						<span className="inline-flex items-start gap-1.5 font-semibold text-attention">
							<Icon name="triangle-alert" size={16} className="mt-0.5 shrink-0" />
							<span>{errors.privacy}</span>
						</span>
					)
				}>
				I have read the{" "}
				<TextLink href="/privacy" tone="ink">
					privacy information
				</TextLink>{" "}
				for this research platform.
			</Checkbox>
			<Button
				type="submit"
				size="lg"
				fullWidth
				icon="mail"
				busy={auth.pending}
				busyLabel="Sending verification code…"
				disabled={waiting}
				disabledReason={`Wait ${formatCountdown(cooldown.remaining)} before trying again.`}>
				Send verification code
			</Button>
			<p className="-mt-2 type-body text-ink">
				Already have an account?{" "}
				<TextLink href={withQuery("/sign-in", { next: carryNext ? next : undefined })} arrow={false}>
					Sign in
				</TextLink>
			</p>
		</form>
	);
}
