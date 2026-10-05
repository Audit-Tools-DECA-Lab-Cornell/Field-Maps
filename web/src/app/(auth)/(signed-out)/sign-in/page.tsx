import type { Metadata } from "next";

import { AuthPanel } from "@/components/shell/AuthSplit";
import { authPageMode, NotConfigured } from "@/features/auth/AuthUnavailable";
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
	const mode = authPageMode(query["preview-state"]);
	return (
		<AuthPanel
			kicker={AUTH_KICKER}
			title="Welcome back"
			lead="Sign in to your research workspace."
			footnote="Observers collect in the mobile app. Signing in here opens the workspace for managers and viewers.">
			{mode.form ? (
				<SignInForm next={safeNext(nextParam)} carryNext={nextParam !== undefined} state={mode.preview} />
			) : (
				<NotConfigured />
			)}
		</AuthPanel>
	);
}
