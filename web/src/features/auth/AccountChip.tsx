import { Avatar } from "@/components/contour/Avatar";
import { TextLink } from "@/components/contour/TextLink";
import type { Person } from "@/fixtures";

/**
 * Who is signed in, on the invitation and join pages (Org 11, Org 12): the initials, the address and a way
 * out for someone using another person's session. "Not you?" leads to sign in.
 */
export function AccountChip({ person }: { person: Person }) {
	return (
		<div className="flex min-w-0 items-center gap-3">
			<Avatar initials={person.initials} tone="ink" size="md" />
			<p className="min-w-0 type-body text-ink wrap-anywhere">
				{person.email} ·{" "}
				<TextLink href="/sign-in" tone="ink" className="py-2.5">
					Not you?
				</TextLink>
			</p>
		</div>
	);
}
