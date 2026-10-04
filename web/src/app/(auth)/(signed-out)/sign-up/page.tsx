import type { Metadata } from "next";

import { AuthPanel } from "@/components/shell/AuthSplit";
import { AUTH_KICKER, param, previewState, type SearchParams } from "@/features/auth/params";
import { SignUpForm } from "@/features/auth/SignUpForm";

export const metadata: Metadata = {
	title: "Create your account",
	robots: { index: false, follow: false }
};

/** Org 7. `?email=` keeps the address when someone comes back to change it. */
export default async function SignUpPage({ searchParams }: { searchParams: SearchParams }) {
	const query = await searchParams;
	return (
		<AuthPanel
			kicker={AUTH_KICKER}
			title="Create your account"
			lead="Your account can join multiple research projects.">
			<SignUpForm initialEmail={param(query.email)} state={previewState(query["preview-state"])} />
		</AuthPanel>
	);
}
