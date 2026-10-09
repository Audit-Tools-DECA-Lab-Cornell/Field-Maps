"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

import { Button } from "@/components/contour/Button";
import { CodeCounter } from "@/components/contour/CodeCounter";
import { CodeInput } from "@/components/contour/CodeInput";
import { Field } from "@/components/contour/Field";
import { TextLink } from "@/components/contour/TextLink";

import { withQuery } from "./params";
import { ResendCodeForm } from "./ResendCodeForm";
import { asksToStartAgain, ServerMessage, StartAgainLink, useAuthAction } from "./useAuthAction";
import { formatCountdown, useCooldown } from "./useCooldown";

const CODE_LENGTH = 6;

export type VerifyFormProps = {
	/** Where a verified account goes next, already made safe by `safeNext`. */
	next: string;
	/** True when the address carried `next`, so "Change email address" keeps it. */
	carryNext: boolean;
	/** Seconds until another code may be sent, from the `fm-email-sent` cookie. */
	cooldownSeconds: number;
};

/**
 * Check your email (Org 8). The code goes to the `authenticate` Server Action by itself at the sixth digit,
 * typed or pasted; the address it checks against is the one the server keeps in an httpOnly cookie. A
 * wrong or expired code reselects the field. Resending waits as long as the server says.
 */
export function VerifyForm({ next, carryNext, cooldownSeconds }: VerifyFormProps) {
	const [code, setCode] = useState("");
	const [error, setError] = useState<string>();
	const formRef = useRef<HTMLFormElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const submitWhenFilled = useRef(false);
	const cooldown = useCooldown();
	const auth = useAuthAction({ fields: { code: inputRef }, onRetryAfter: cooldown.start });
	const waiting = cooldown.remaining > 0;
	const startAgainHref = withQuery("/sign-up", { next: carryNext ? next : undefined });

	// A full code submits once it is on the page, so the form posts the cleaned digits.
	useEffect(() => {
		if (!submitWhenFilled.current || code.length !== CODE_LENGTH) return;
		submitWhenFilled.current = false;
		formRef.current?.requestSubmit();
	}, [code]);

	function submit(event: FormEvent<HTMLFormElement>) {
		if (auth.pending || waiting) return event.preventDefault();
		if (code.length < CODE_LENGTH) {
			event.preventDefault();
			setError("Enter all six digits from the email.");
			inputRef.current?.focus();
		}
	}

	return (
		<div className="flex flex-col gap-5">
			<form
				ref={formRef}
				action={auth.action}
				noValidate
				onSubmit={submit}
				className="flex flex-col gap-5"
				aria-busy={auth.pending || undefined}>
				<input type="hidden" name="intent" value="verify" />
				<input type="hidden" name="next" value={next} />
				<ServerMessage {...auth.note}>
					{asksToStartAgain(auth.state) && <StartAgainLink href={startAgainHref} />}
				</ServerMessage>
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
						invalid={auth.invalid("code") || undefined}
						aria-describedby={auth.describedBy("code")}
						onChange={value => {
							setCode(value);
							setError(undefined);
							auth.edited();
						}}
						onComplete={() => {
							submitWhenFilled.current = true;
						}}
					/>
				</Field>
				<Button
					type="submit"
					size="lg"
					fullWidth
					icon="check"
					busy={auth.pending}
					disabled={waiting}
					disabledReason={`Wait ${formatCountdown(cooldown.remaining)} before trying again.`}>
					{auth.pending ? "Verifying email…" : "Verify email"}
				</Button>
			</form>
			<ResendCodeForm
				kind="verify"
				cooldownSeconds={cooldownSeconds}
				codeRef={inputRef}
				startAgainHref={startAgainHref}
			/>
			<p className="-mt-2.5 type-body">
				<TextLink href={startAgainHref} arrow={false} className="inline-flex min-h-touch items-center">
					Change email address
				</TextLink>
			</p>
		</div>
	);
}
