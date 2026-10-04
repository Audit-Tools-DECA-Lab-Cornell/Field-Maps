import type { Metadata } from "next";

import { AuthPanel } from "@/components/shell/AuthSplit";
import { ForgotPasswordForm } from "@/features/auth/ForgotPasswordForm";
import { AUTH_KICKER, param, previewState, type SearchParams } from "@/features/auth/params";

export const metadata: Metadata = {
	title: "Reset your password",
	robots: { index: false, follow: false }
};

/** Org 9. `?email=` carries the address typed on the sign-in page. */
export default async function ForgotPasswordPage({ searchParams }: { searchParams: SearchParams }) {
	const query = await searchParams;
	return (
		<AuthPanel
			kicker={AUTH_KICKER}
			title="Reset your password"
			lead="If an account exists for this email, we will send a recovery code."
			footnote="The same message appears whether or not the address has an account, so nobody can use this form to look one up.">
			<ForgotPasswordForm initialEmail={param(query.email)} state={previewState(query["preview-state"])} />
		</AuthPanel>
	);
}
