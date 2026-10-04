"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState, useTransition } from "react";

import { Button } from "@/components/contour/Button";
import { Field } from "@/components/contour/Field";
import { Note } from "@/components/contour/Note";
import { PasswordInput } from "@/components/contour/PasswordInput";
import { TextInput } from "@/components/contour/TextInput";
import { TextLink } from "@/components/contour/TextLink";

import { OfflineNote } from "./OfflineNote";
import { type AuthPreviewState, isEmail, withQuery } from "./params";

type Errors = { email?: string; password?: string };

export type SignInFormProps = {
	initialEmail?: string;
	/** Where the preview goes once the form is valid. */
	next: string;
	state: AuthPreviewState;
};

/**
 * Sign in (Org 6). In this preview any well-formed address and any password continue to the workspace;
 * nothing is checked against an account. `?preview-state=error` shows the wrong-credentials message,
 * `?preview-state=offline` the offline form.
 */
export function SignInForm({ initialEmail = "", next, state }: SignInFormProps) {
	const router = useRouter();
	const [email, setEmail] = useState(initialEmail);
	const [password, setPassword] = useState("");
	const [errors, setErrors] = useState<Errors>({});
	const [rejected, setRejected] = useState(false);
	const [pending, startTransition] = useTransition();
	const emailRef = useRef<HTMLInputElement>(null);
	const passwordRef = useRef<HTMLInputElement>(null);
	const offline = state === "offline";

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (pending || offline) return;
		const found: Errors = {
			email: isEmail(email) ? undefined : "Enter the email address you signed up with.",
			password: password.length > 0 ? undefined : "Enter your password."
		};
		setErrors(found);
		if (found.email) return emailRef.current?.focus();
		if (found.password) return passwordRef.current?.focus();
		if (state === "error") {
			setRejected(true);
			setPassword("");
			return passwordRef.current?.focus();
		}
		startTransition(() => router.push(next));
	}

	return (
		<form noValidate onSubmit={submit} className="flex flex-col gap-5" aria-busy={pending || undefined}>
			{offline && <OfflineNote />}
			{rejected && (
				<Note tone="attention" title="That email and password do not match an account." live="assertive">
					Nothing was changed. Check both and try again, or reset your password.
				</Note>
			)}
			<Field label="Email address" htmlFor="sign-in-email" error={errors.email}>
				<TextInput
					ref={emailRef}
					type="email"
					name="email"
					autoComplete="email"
					autoCapitalize="none"
					autoCorrect="off"
					spellCheck={false}
					autoFocus
					value={email}
					onChange={event => {
						setEmail(event.currentTarget.value);
						setErrors(current => ({ ...current, email: undefined }));
					}}
				/>
			</Field>
			<Field label="Password" htmlFor="sign-in-password" error={errors.password}>
				<PasswordInput
					ref={passwordRef}
					name="password"
					autoComplete="current-password"
					value={password}
					onChange={event => {
						setPassword(event.currentTarget.value);
						setErrors(current => ({ ...current, password: undefined }));
					}}
				/>
			</Field>
			<Button
				type="submit"
				size="lg"
				fullWidth
				iconRight="arrow-right"
				busy={pending}
				disabled={offline}
				disabledReason="Signing in needs a connection.">
				{/* A full-width button keeps its width anyway, so the label swaps without the primitive's
				    reserved busy width, which would push the arrow away from "Sign in" at rest. */}
				{pending ? "Signing in…" : "Sign in"}
			</Button>
			<div className="-mt-2.5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 type-body">
				<TextLink
					href={withQuery("/forgot-password", { email: email.trim() || undefined })}
					arrow={false}
					className="inline-flex min-h-touch items-center">
					Forgot password?
				</TextLink>
				<TextLink
					href={withQuery("/sign-up", { email: email.trim() || undefined })}
					arrow={false}
					className="inline-flex min-h-touch items-center">
					Create account
				</TextLink>
			</div>
		</form>
	);
}
