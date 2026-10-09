import type { Metadata } from "next";
import { cookies } from "next/headers";

import { AuthPanel } from "@/components/shell/AuthSplit";
import { NotConfigured, signInAvailable, StartAgain } from "@/features/auth/AuthUnavailable";
import { AUTH_KICKER, param, resendCooldown, type SearchParams, withQuery } from "@/features/auth/params";
import { VerifyForm } from "@/features/auth/VerifyForm";
import { safeNext } from "@/lib/auth/navigation";

export const metadata: Metadata = {
	title: "Check your email",
	robots: { index: false, follow: false },
	referrer: "no-referrer"
};

/**
 * Org 8. The address the code went to comes from the httpOnly cookie the sign-in action set, never from
 * the URL; without it the page asks the person to start again. `?next=` is where a verified account goes.
 */
export default async function VerifyPage({ searchParams }: { searchParams: SearchParams }) {
	const query = await searchParams;
	const nextParam = param(query.next);
	const next = safeNext(nextParam);
	const available = signInAvailable();
	const store = await cookies();
	const email = store.get("fm-verify-email")?.value || undefined;
	const ready = available && email !== undefined;
	return (
		<AuthPanel
			kicker={AUTH_KICKER}
			title="Check your email"
			lead={
				ready ? (
					<>
						We sent a six-digit code to{" "}
						<strong className="font-semibold wrap-anywhere text-ink">{email}</strong>.
					</>
				) : (
					"Enter the six-digit code we sent to your email address."
				)
			}
			footnote={
				ready
					? "Nothing arriving? Check the spam folder, then resend. A new code replaces the old one."
					: undefined
			}>
			{!available ? (
				<NotConfigured />
			) : !ready ? (
				<StartAgain
					href={withQuery("/sign-up", { next: nextParam !== undefined ? next : undefined })}
					nothing="Nothing was verified."
				/>
			) : (
				<VerifyForm
					next={next}
					carryNext={nextParam !== undefined}
					cooldownSeconds={resendCooldown(store.get("fm-email-sent")?.value)}
				/>
			)}
		</AuthPanel>
	);
}
