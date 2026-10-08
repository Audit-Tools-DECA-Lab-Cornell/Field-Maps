import { Avatar } from "@/components/contour/Avatar";
import { TextLink } from "@/components/contour/TextLink";
import type { Person } from "@/fixtures";
import { signOut } from "@/lib/auth/actions";
import { supabaseConfig } from "@/lib/supabase/config";

/** The ink TextLink's look, for the sign-out button that reads as a link beside the address. */
const INK_LINK = "py-2.5 text-ink underline decoration-1 underline-offset-4 hover:decoration-2";

/**
 * Who is signed in, on the invitation and join pages (Org 11, Org 12): the initials, the address and a way
 * out for someone using another person's session. "Not you?" signs out through the `signOut` Server
 * Action, which lands on sign in. Without Supabase (a preview build) there is no session to end, so it
 * simply leads to sign in.
 */
export function AccountChip({ person }: { person: Person }) {
	return (
		<div className="flex min-w-0 items-center gap-3">
			<Avatar initials={person.initials} tone="ink" size="md" />
			<div className="min-w-0 type-body text-ink wrap-anywhere">
				{person.email} ·{" "}
				{supabaseConfig() ? (
					<form action={signOut} className="inline">
						<button type="submit" className={INK_LINK}>
							Not you?
						</button>
					</form>
				) : (
					<TextLink href="/sign-in" tone="ink" className="py-2.5">
						Not you?
					</TextLink>
				)}
			</div>
		</div>
	);
}
