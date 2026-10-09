import { ButtonLink } from "@/components/contour/Button";

import { withQuery } from "./params";

/**
 * What someone sees on the invitation and join pages before they are signed in: sign in, or create an
 * account, and come back to the same page afterwards (`next`). Sign in is the one primary action.
 */
export function InvitationSignIn({ next }: { next: "/invite" | "/join" }) {
	return (
		<div className="flex flex-col gap-3">
			<ButtonLink variant="primary" size="lg" fullWidth href={withQuery("/sign-in", { next })}>
				Sign in
			</ButtonLink>
			<ButtonLink variant="outline" size="lg" fullWidth href={withQuery("/sign-up", { next })}>
				Create an account
			</ButtonLink>
		</div>
	);
}
