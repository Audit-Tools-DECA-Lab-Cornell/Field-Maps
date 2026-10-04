"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState, useTransition } from "react";

import { Button } from "@/components/contour/Button";
import { Checkbox } from "@/components/contour/Checkbox";
import { Field } from "@/components/contour/Field";
import { Icon } from "@/components/contour/Icon";
import { TextInput } from "@/components/contour/TextInput";
import { TextLink } from "@/components/contour/TextLink";
import { useToast } from "@/components/contour/Toast";

import { OfflineNote } from "./OfflineNote";
import { type AuthPreviewState, isEmail, MIN_PASSWORD_LENGTH, withQuery } from "./params";
import { PasswordFields } from "./PasswordFields";

type Errors = { email?: string; password?: string; confirm?: string; privacy?: string };

export type SignUpFormProps = {
	initialEmail?: string;
	state: AuthPreviewState;
};

/**
 * Create your account (Org 7). The checks run in the browser; the preview sends nothing and moves on to
 * the code screen, saying so in a toast.
 */
export function SignUpForm({ initialEmail = "", state }: SignUpFormProps) {
	const router = useRouter();
	const { toast } = useToast();
	const [email, setEmail] = useState(initialEmail);
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [privacy, setPrivacy] = useState(false);
	const [errors, setErrors] = useState<Errors>({});
	const [pending, startTransition] = useTransition();
	const emailRef = useRef<HTMLInputElement>(null);
	const passwordRef = useRef<HTMLInputElement>(null);
	const confirmRef = useRef<HTMLInputElement>(null);
	const offline = state === "offline";

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (pending || offline) return;
		const found: Errors = {
			email: isEmail(email) ? undefined : "Enter an email address, such as name@example.org.",
			password: password.length >= MIN_PASSWORD_LENGTH ? undefined : "Use at least 12 characters.",
			confirm:
				confirm.length === 0
					? "Enter the same password again."
					: confirm !== password
						? "Does not match yet"
						: undefined,
			privacy: privacy ? undefined : "Confirm that you have read the privacy information."
		};
		setErrors(found);
		if (found.email) return emailRef.current?.focus();
		if (found.password) return passwordRef.current?.focus();
		if (found.confirm) return confirmRef.current?.focus();
		if (found.privacy) return document.getElementById("sign-up-privacy")?.focus();
		toast({ title: "Preview · No email was sent", description: "Enter any six digits to continue." });
		startTransition(() => router.push(withQuery("/verify", { email: email.trim() })));
	}

	return (
		<form noValidate onSubmit={submit} className="flex flex-col gap-5" aria-busy={pending || undefined}>
			{offline && <OfflineNote />}
			<Field label="Email address" htmlFor="sign-up-email" error={errors.email}>
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
			<PasswordFields
				passwordId="sign-up-password"
				confirmId="sign-up-confirm"
				passwordLabel="Password"
				confirmLabel="Confirm password"
				rule="Use at least 12."
				password={password}
				confirm={confirm}
				onPasswordChange={value => {
					setPassword(value);
					setErrors(current => ({ ...current, password: undefined, confirm: undefined }));
				}}
				onConfirmChange={value => {
					setConfirm(value);
					setErrors(current => ({ ...current, confirm: undefined }));
				}}
				passwordError={errors.password}
				confirmError={errors.confirm}
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
				busy={pending}
				disabled={offline}
				disabledReason="Creating an account needs a connection.">
				Send verification code
			</Button>
			<p className="-mt-2 type-body text-ink">
				Already have an account?{" "}
				<TextLink href={withQuery("/sign-in", { email: email.trim() || undefined })} arrow={false}>
					Sign in
				</TextLink>
			</p>
		</form>
	);
}
