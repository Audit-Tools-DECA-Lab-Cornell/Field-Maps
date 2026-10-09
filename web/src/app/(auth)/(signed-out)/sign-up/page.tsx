import type { Metadata } from "next";

import { AuthPanel } from "@/components/shell/AuthSplit";
import { NotConfigured, signInAvailable } from "@/features/auth/AuthUnavailable";
import { isInvitationPath } from "@/features/auth/invitation";
import { AUTH_KICKER, param, type SearchParams } from "@/features/auth/params";
import { SignUpForm } from "@/features/auth/SignUpForm";
import { safeNext } from "@/lib/auth/navigation";

export const metadata: Metadata = {
	title: "Create your account",
	robots: { index: false, follow: false }
};

/** Org 7. `?next=` is where the account continues once its email is verified. */
export default async function SignUpPage({ searchParams }: { searchParams: SearchParams }) {
	const query = await searchParams;
	const nextParam = param(query.next);
	const next = safeNext(nextParam);
	return (
		<AuthPanel
			kicker={AUTH_KICKER}
			title="Create your account"
			lead={
				isInvitationPath(next)
					? "Create an account to continue with your invitation."
					: "Your account can join multiple research projects."
			}>
			{signInAvailable() ? <SignUpForm next={next} carryNext={nextParam !== undefined} /> : <NotConfigured />}
		</AuthPanel>
	);
}
