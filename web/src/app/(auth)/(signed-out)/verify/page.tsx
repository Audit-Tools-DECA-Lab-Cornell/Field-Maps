import type { Metadata } from "next";

import { AuthPanel } from "@/components/shell/AuthSplit";
import { AUTH_KICKER, param, previewState, safeNext, type SearchParams } from "@/features/auth/params";
import { VerifyForm } from "@/features/auth/VerifyForm";
import { VIEWER } from "@/fixtures";

export const metadata: Metadata = {
	title: "Check your email",
	robots: { index: false, follow: false },
	referrer: "no-referrer"
};

/** Org 8. `?email=` names the address the code went to; without it the preview's own account is shown. */
export default async function VerifyPage({ searchParams }: { searchParams: SearchParams }) {
	const query = await searchParams;
	const email = param(query.email)?.trim() || VIEWER.email;
	return (
		<AuthPanel
			kicker={AUTH_KICKER}
			title="Check your email"
			lead={
				<>
					We sent a six-digit code to{" "}
					<strong className="font-semibold wrap-anywhere text-ink">{email}</strong>.
				</>
			}
			footnote="Nothing arriving? Check the spam folder, then resend. A new code replaces the old one.">
			<VerifyForm
				email={email}
				next={safeNext(query.next, "/onboarding/organization")}
				state={previewState(query["preview-state"])}
			/>
		</AuthPanel>
	);
}
