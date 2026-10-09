import { LoadFailure } from "@/components/shell/LoadFailure";

/**
 * The no-access state of the owner and admin pages (Members, Settings), for someone who belongs to the
 * organization with another role. The page names what it needs; the reason says who can change that.
 */
export function OrgNoAccess({ what, noAccess }: { what: string; noAccess: string }) {
	return (
		<LoadFailure
			what={what}
			noAccess={noAccess}
			failure={{
				code: "role_required",
				kind: "rejected",
				message: "Ask an owner or admin of this organization if you need to see it."
			}}
		/>
	);
}
