import type { Metadata } from "next";

import { AuthPanel } from "@/components/shell/AuthSplit";
import { AUTH_KICKER, param, PREVIEW_HOME, previewState, safeNext, type SearchParams } from "@/features/auth/params";
import { SignInForm } from "@/features/auth/SignInForm";

export const metadata: Metadata = {
	title: "Sign in",
	robots: { index: false, follow: false }
};

/** Org 6. `?email=` fills the address; `?next=` is where a signed-in reader continues. */
export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
	const query = await searchParams;
	return (
		<AuthPanel
			kicker={AUTH_KICKER}
			title="Welcome back"
			lead="Sign in to your research workspace."
			footnote="Observers collect in the mobile app. Signing in here opens the workspace for managers and viewers.">
			<SignInForm
				initialEmail={param(query.email)}
				next={safeNext(query.next, PREVIEW_HOME)}
				state={previewState(query["preview-state"])}
			/>
		</AuthPanel>
	);
}
