"use client";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import { PrimaryAction } from "@/components/nocturne/chrome";
import { authenticate } from "@/lib/auth/actions";

export type AuthMode = "sign-in" | "sign-up" | "verify" | "forgot-password" | "reset-password";
const labels = {
	"sign-in": "Sign in",
	"sign-up": "Create account",
	verify: "Verify email",
	"forgot-password": "Send recovery code",
	"reset-password": "Reset password"
} as const;
const inputClass = "min-h-11 w-full rounded-md border border-rule bg-bg px-base text-body text-text";

export function AuthForm({
	mode,
	next,
	cooldown = 0
}: {
	readonly mode: AuthMode;
	readonly next: string;
	readonly cooldown?: number;
}) {
	const [remaining, setRemaining] = useState(cooldown);
	const [state, action, pending] = useActionState(
		async (previous: Awaited<ReturnType<typeof authenticate>>, form: FormData) => {
			const result = await authenticate(previous, form);
			if (result.retryAfter) setRemaining(result.retryAfter);
			return result;
		},
		{ message: "" }
	);
	useEffect(() => {
		if (remaining <= 0) return;
		const timer = setTimeout(() => setRemaining(value => value - 1), 1000);
		return () => clearTimeout(timer);
	}, [remaining]);
	const code = mode === "verify" || mode === "reset-password";
	return (
		<form action={action} className="flex flex-col gap-base">
			<input type="hidden" name="next" value={next} />
			{!code && (
				<label className="flex flex-col gap-tight text-detail">
					Email
					<input
						className={inputClass}
						name="email"
						type="email"
						autoComplete="email"
						required
						maxLength={254}
					/>
				</label>
			)}
			{code && (
				<label className="flex flex-col gap-tight text-detail">
					Six-digit email code
					<input
						className={inputClass}
						name="code"
						inputMode="numeric"
						autoComplete="one-time-code"
						pattern="[0-9]{6}"
						maxLength={6}
						required
					/>
				</label>
			)}
			{mode !== "verify" && mode !== "forgot-password" && (
				<label className="flex flex-col gap-tight text-detail">
					{mode === "reset-password" ? "New password" : "Password"}
					<input
						className={inputClass}
						name="password"
						type="password"
						autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
						required
						minLength={8}
						maxLength={128}
					/>
				</label>
			)}
			{state.message && (
				<p role="status" className="text-detail text-attention-text">
					{state.message}
				</p>
			)}
			{state.verify && (
				<Link
					className="inline-flex min-h-11 items-center text-accent-300"
					href={`/verify?next=${encodeURIComponent(next)}`}>
					Enter verification code
				</Link>
			)}
			<button
				className="min-h-11 rounded-md border border-accent px-loose text-body text-accent-200 disabled:opacity-45"
				type="submit"
				name="intent"
				value={mode}
				disabled={pending}>
				{pending ? "Please wait…" : labels[mode]}
			</button>
			{code && (
				<button
					className="min-h-11 rounded-md text-detail text-neutral-300 disabled:opacity-45"
					type="submit"
					name="intent"
					value={mode === "verify" ? "resend" : "resend-recovery"}
					formNoValidate
					disabled={pending || remaining > 0}>
					{remaining > 0 ? `Resend code in ${remaining}s` : "Resend code"}
				</button>
			)}
			{mode === "sign-in" && (
				<>
					<PrimaryAction href={`/sign-up?next=${encodeURIComponent(next)}`}>Create account</PrimaryAction>
					<Link
						className="inline-flex min-h-11 items-center text-detail text-accent-300"
						href="/forgot-password">
						Forgot password?
					</Link>
				</>
			)}
			{mode !== "sign-in" && (
				<Link
					className="inline-flex min-h-11 items-center text-detail text-accent-300"
					href={`/sign-in?next=${encodeURIComponent(next)}`}>
					Back to sign in
				</Link>
			)}
		</form>
	);
}
