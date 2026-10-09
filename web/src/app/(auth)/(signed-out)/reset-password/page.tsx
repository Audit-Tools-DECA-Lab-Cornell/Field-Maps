import type { Metadata } from "next";
import { cookies } from "next/headers";

import { AuthPanel } from "@/components/shell/AuthSplit";
import { NotConfigured, signInAvailable, StartAgain } from "@/features/auth/AuthUnavailable";
import { AUTH_KICKER, param, resendCooldown, type SearchParams } from "@/features/auth/params";
import { ResetPasswordForm } from "@/features/auth/ResetPasswordForm";
import { safeNext } from "@/lib/auth/navigation";

export const metadata: Metadata = {
	title: "Choose a new password",
	robots: { index: false, follow: false },
	referrer: "no-referrer"
};

/**
 * Org 10. The address the recovery code went to comes from the httpOnly cookie the sign-in action set,
 * never from the URL; without it the page asks the person to start again. `?next=` is where the account
 * continues once the password is saved.
 */
export default async function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
	const query = await searchParams;
	const available = signInAvailable();
	const store = await cookies();
	const email = store.get("fm-recovery-email")?.value || undefined;
	const ready = available && email !== undefined;
	return (
		<AuthPanel
			kicker={AUTH_KICKER}
			title="Choose a new password"
			lead={
				ready ? (
					<>
						Enter the recovery code sent to{" "}
						<strong className="font-semibold wrap-anywhere text-ink">{email}</strong>, then set a new
						password.
					</>
				) : (
					"Verify the recovery code, then set a new password."
				)
			}
			footnote={
				ready
					? "Saving signs you out everywhere else. Records waiting on your phone stay there until you sign in again."
					: undefined
			}>
			{!available ? (
				<NotConfigured />
			) : !ready ? (
				<StartAgain href="/forgot-password" nothing="Nothing was changed." />
			) : (
				<ResetPasswordForm
					next={safeNext(param(query.next))}
					cooldownSeconds={resendCooldown(store.get("fm-email-sent")?.value)}
				/>
			)}
		</AuthPanel>
	);
}
