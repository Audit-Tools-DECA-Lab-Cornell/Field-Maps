"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState, useTransition } from "react";

import { Button } from "@/components/contour/Button";
import { Field } from "@/components/contour/Field";
import { TextInput } from "@/components/contour/TextInput";
import { TextLink } from "@/components/contour/TextLink";
import { useToast } from "@/components/contour/Toast";

import { OfflineNote } from "./OfflineNote";
import { type AuthPreviewState, isEmail, withQuery } from "./params";

export type ForgotPasswordFormProps = {
	initialEmail?: string;
	state: AuthPreviewState;
};

/**
 * Reset your password (Org 9). The same thing happens whether or not the address has an account, so the
 * form cannot be used to look one up. The preview sends nothing and moves on to the recovery code.
 */
export function ForgotPasswordForm({ initialEmail = "", state }: ForgotPasswordFormProps) {
	const router = useRouter();
	const { toast } = useToast();
	const [email, setEmail] = useState(initialEmail);
	const [error, setError] = useState<string>();
	const [pending, startTransition] = useTransition();
	const emailRef = useRef<HTMLInputElement>(null);
	const offline = state === "offline";

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (pending || offline) return;
		if (!isEmail(email)) {
			setError("Enter the email address you signed up with.");
			emailRef.current?.focus();
			return;
		}
		toast({ title: "Preview · No email was sent", description: "Enter any six digits to continue." });
		startTransition(() => router.push(withQuery("/reset-password", { email: email.trim() })));
	}

	return (
		<form noValidate onSubmit={submit} className="flex flex-col gap-5" aria-busy={pending || undefined}>
			{offline && <OfflineNote />}
			<Field label="Email address" htmlFor="forgot-email" error={error}>
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
						setError(undefined);
					}}
				/>
			</Field>
			<Button
				type="submit"
				size="lg"
				fullWidth
				icon="mail"
				busy={pending}
				disabled={offline}
				disabledReason="Sending a recovery code needs a connection.">
				Send recovery code
			</Button>
			<p className="-mt-2.5 type-body">
				<TextLink
					href={withQuery("/sign-in", { email: email.trim() || undefined })}
					arrow="left"
					className="py-2.5">
					Back to sign in
				</TextLink>
			</p>
		</form>
	);
}
