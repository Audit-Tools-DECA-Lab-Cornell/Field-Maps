"use client";

import { usePathname } from "next/navigation";

import { Avatar } from "@/components/contour/Avatar";
import type { AccountSummary } from "@/lib/workspace/types";

import { switchAccount } from "./actions";
import { isInvitationPath } from "./invitation";

/** The ink TextLink's look, for the sign-out button that reads as a link beside the address. */
const INK_LINK = "py-2.5 text-ink underline decoration-1 underline-offset-4 hover:decoration-2";

/**
 * Who is signed in, on the invitation and join pages (Org 11, Org 12): the person's initials and email
 * address as the sign-in knows them, and a way out for someone who opened the link on another person's
 * account. "Not you?" signs out and returns to sign in, which comes back to this page.
 */
export function AccountChip({ account }: { account: AccountSummary }) {
	const pathname = usePathname();
	return (
		<div className="flex min-w-0 items-center gap-3">
			<Avatar initials={account.initials} tone="ink" size="md" />
			<div className="min-w-0 type-body text-ink wrap-anywhere">
				{account.email ?? account.name} ·{" "}
				<form action={switchAccount} className="inline">
					<input type="hidden" name="next" value={isInvitationPath(pathname) ? pathname : "/o"} />
					<button type="submit" className={INK_LINK}>
						Not you?
					</button>
				</form>
			</div>
		</div>
	);
}
