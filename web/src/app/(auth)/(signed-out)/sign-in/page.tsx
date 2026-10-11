import type { Metadata } from "next";

import { AuthPanel } from "@/components/shell/AuthSplit";
import { NotConfigured, signInAvailable } from "@/features/auth/AuthUnavailable";
import { isInvitationPath } from "@/features/auth/invitation";
import { AUTH_KICKER, param, type SearchParams } from "@/features/auth/params";
import { SignInForm } from "@/features/auth/SignInForm";
import { safeNext } from "@/lib/auth/navigation";

export const metadata: Metadata = {
	title: "Sign in",
	robots: { index: false, follow: false }
};

/** Org 6. `?next=` is where a signed-in reader continues (made safe by `safeNext`). */
export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
	const query = await searchParams;
	const nextParam = param(query.next);
	const next = safeNext(nextParam);
	return (
		<AuthPanel
			kicker={AUTH_KICKER}
			title="Welcome back"
			lead={
				isInvitationPath(next)
					? "Sign in to continue with your invitation."
					: "Sign in to your research workspace."
			}
			footnote="Observers collect in the DECA Mark app. This site is for managers and viewers, and for joining a project.">
			{signInAvailable() ? <SignInForm next={next} carryNext={nextParam !== undefined} /> : <NotConfigured />}
		</AuthPanel>
	);
}
