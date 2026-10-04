import type { Metadata } from "next";

import { AuthPanel } from "@/components/shell/AuthSplit";
import { AUTH_KICKER, param, previewState, type SearchParams } from "@/features/auth/params";
import { ResetPasswordForm } from "@/features/auth/ResetPasswordForm";

export const metadata: Metadata = {
	title: "Choose a new password",
	robots: { index: false, follow: false },
	referrer: "no-referrer"
};

/** Org 10. `?email=` is carried back to sign in once the password is saved. */
export default async function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
	const query = await searchParams;
	return (
		<AuthPanel
			kicker={AUTH_KICKER}
			title="Choose a new password"
			lead="Verify the recovery code, then set a new password."
			footnote="Saving signs you out everywhere else. Records waiting on your phone stay there until you sign in again.">
			<ResetPasswordForm
				email={param(query.email)?.trim() || undefined}
				state={previewState(query["preview-state"])}
			/>
		</AuthPanel>
	);
}
