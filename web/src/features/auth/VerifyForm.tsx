"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState, useTransition } from "react";

import { Button } from "@/components/contour/Button";
import { CodeCounter } from "@/components/contour/CodeCounter";
import { CodeInput } from "@/components/contour/CodeInput";
import { Field } from "@/components/contour/Field";
import { TextLink } from "@/components/contour/TextLink";
import { useToast } from "@/components/contour/Toast";

import { OfflineNote } from "./OfflineNote";
import { type AuthPreviewState, withQuery, WRONG_CODE_DEMO } from "./params";
import { formatCountdown, useCooldown } from "./useCooldown";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;

export type VerifyFormProps = {
	email: string;
	/** Where a verified account goes next. */
	next: string;
	state: AuthPreviewState;
};

/** Selects the whole code once the field has settled, so the next digits typed replace it. */
function reselect(input: HTMLInputElement | null) {
	requestAnimationFrame(() => {
		if (!input) return;
		input.focus();
		input.select();
	});
}

/**
 * Check your email (Org 8). The code checks itself at the sixth digit, typed or pasted. In this preview any
 * six digits continue, and 000000 shows the wrong-code message. Resending waits 30 seconds between codes.
 */
export function VerifyForm({ email, next, state }: VerifyFormProps) {
	const router = useRouter();
	const { toast } = useToast();
	const [code, setCode] = useState("");
	const [error, setError] = useState<string>();
	const [pending, startTransition] = useTransition();
	const inputRef = useRef<HTMLInputElement>(null);
	const cooldown = useCooldown(RESEND_SECONDS);
	const offline = state === "offline";

	function check(value: string) {
		if (pending || offline) return;
		if (value.length < CODE_LENGTH) {
			setError("Enter all six digits from the email.");
			inputRef.current?.focus();
			return;
		}
		if (value === WRONG_CODE_DEMO) {
			setError("That code did not match. Check the latest email and try again.");
			reselect(inputRef.current);
			return;
		}
		setError(undefined);
		startTransition(() => router.push(next));
	}

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		check(code);
	}

	function resend() {
		cooldown.start();
		setCode("");
		setError(undefined);
		toast({ title: "Preview · No email was sent", description: `A new code would go to ${email}.` });
		inputRef.current?.focus();
	}

	const waiting = cooldown.remaining > 0;

	return (
		<form noValidate onSubmit={submit} className="flex flex-col gap-5" aria-busy={pending || undefined}>
			{offline && <OfflineNote />}
			<Field
				label="Verification code"
				htmlFor="verify-code"
				hint="Paste all six digits."
				error={error}
				counter={<CodeCounter value={code} length={CODE_LENGTH} />}>
				<CodeInput
					ref={inputRef}
					id="verify-code"
					name="code"
					length={CODE_LENGTH}
					kind="otp"
					value={code}
					autoFocus
					onChange={value => {
						setCode(value);
						setError(undefined);
					}}
					onComplete={check}
				/>
			</Field>
			<Button
				type="submit"
				size="lg"
				fullWidth
				icon="check"
				busy={pending}
				disabled={offline}
				disabledReason="Checking the code needs a connection.">
				{pending ? "Verifying email…" : "Verify email"}
			</Button>
			<Button
				variant="outline"
				size="lg"
				fullWidth
				icon="rotate-cw"
				onClick={resend}
				disabled={waiting || offline}
				disabledReason={
					offline ? "Sending a new code needs a connection." : "A new code can be sent every 30 seconds."
				}>
				{waiting ? (
					<>
						Resend in <span className="font-mono tnum">{formatCountdown(cooldown.remaining)}</span>
					</>
				) : (
					"Resend code"
				)}
			</Button>
			<p className="-mt-2.5 type-body">
				<TextLink
					href={withQuery("/sign-up", { email })}
					arrow={false}
					className="inline-flex min-h-touch items-center">
					Change email address
				</TextLink>
			</p>
		</form>
	);
}
