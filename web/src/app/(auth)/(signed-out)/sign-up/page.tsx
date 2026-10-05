import type { Metadata } from "next";

import { AuthPanel } from "@/components/shell/AuthSplit";
import { authPageMode, NotConfigured } from "@/features/auth/AuthUnavailable";
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
	const mode = authPageMode(query["preview-state"]);
	return (
		<AuthPanel
			kicker={AUTH_KICKER}
			title="Create your account"
			lead="Your account can join multiple research projects.">
			{mode.form ? (
				<SignUpForm next={safeNext(nextParam)} carryNext={nextParam !== undefined} state={mode.preview} />
			) : (
				<NotConfigured />
			)}
		</AuthPanel>
	);
}
