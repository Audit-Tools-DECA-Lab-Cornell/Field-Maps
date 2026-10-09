import type { Metadata } from "next";

import { AuthPanel } from "@/components/shell/AuthSplit";
import { NotConfigured, signInAvailable } from "@/features/auth/AuthUnavailable";
import { ForgotPasswordForm } from "@/features/auth/ForgotPasswordForm";
import { AUTH_KICKER, param, type SearchParams } from "@/features/auth/params";
import { safeNext } from "@/lib/auth/navigation";

export const metadata: Metadata = {
	title: "Reset your password",
	robots: { index: false, follow: false }
};

/** Org 9. The address is posted to FieldMaps, never put in a URL. */
export default async function ForgotPasswordPage({ searchParams }: { searchParams: SearchParams }) {
	const query = await searchParams;
	const nextParam = param(query.next);
	return (
		<AuthPanel
			kicker={AUTH_KICKER}
			title="Reset your password"
			lead="If an account exists for this email, we will send a recovery code."
			footnote="The same message appears whether or not the address has an account, so nobody can use this form to look one up.">
			{signInAvailable() ? (
				<ForgotPasswordForm next={safeNext(nextParam)} carryNext={nextParam !== undefined} />
			) : (
				<NotConfigured />
			)}
		</AuthPanel>
	);
}
