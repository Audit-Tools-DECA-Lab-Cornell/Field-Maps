import Link from "next/link";

import { getIdentity } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { signOut } from "@/lib/auth/actions";
import { requireUser } from "@/lib/supabase/server";
export const metadata = { title: "Account", robots: { index: false, follow: false } };
export default async function AccountPage() {
	await requireUser();
	const result = await getIdentity()
		.then(identity => ({ identity, message: null }))
		.catch((error: unknown) => {
			if (!(error instanceof ApiError)) throw error;
			return { identity: null, message: error.message };
		});
	const identity = result.identity;
	const content = identity ? (
		<>
			<h1 className="text-title">{identity.profile.display_name || "Your account"}</h1>
			<p className="text-detail text-neutral-400">Live account data from FieldMaps API</p>
			<dl className="text-body">
				<dt>Account ID</dt>
				<dd className="break-all">{identity.profile.user_id}</dd>
				<dt>Organizations</dt>
				<dd>{identity.organization_memberships.length}</dd>
				<dt>Projects</dt>
				<dd>{identity.project_memberships.length}</dd>
			</dl>
		</>
	) : (
		<p role="alert" className="text-detail text-attention-text">
			{result.message}
		</p>
	);
	return (
		<main className="mx-auto flex max-w-xl flex-col gap-loose px-gutter py-wide">
			{content}
			<p className="text-detail text-neutral-400">
				Profile editing and account deletion are not available here yet.
			</p>
			<details>
				<summary className="min-h-11 cursor-pointer text-body">Account menu</summary>
				<form action={signOut}>
					<button className="min-h-11 rounded-md border border-rule px-loose text-body" type="submit">
						Sign out
					</button>
				</form>
			</details>
			<Link className="inline-flex min-h-11 items-center text-accent-300" href="/onboarding">
				Continue to setup preview
			</Link>
		</main>
	);
}
