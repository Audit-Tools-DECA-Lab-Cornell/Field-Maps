import type { Metadata } from "next";

import { ProposalNote } from "@/components/contour/ProposalNote";
import { AuthPanel } from "@/components/shell/AuthSplit";
import { JoinForm } from "@/features/auth/JoinForm";
import { cleanJoinCode, param, previewState, type SearchParams } from "@/features/auth/params";

export const metadata: Metadata = {
	title: "Join a project",
	robots: { index: false, follow: false }
};

/** Org 12, PROPOSAL U3. `?code=` fills the field when someone comes back to change a code. */
export default async function JoinPage({ searchParams }: { searchParams: SearchParams }) {
	const query = await searchParams;
	const code = param(query.code);
	return (
		<AuthPanel
			kicker="Join by code"
			title="Join a project"
			lead="Enter the eight-character code supplied by your coordinator. You will see the project before joining.">
			<JoinForm
				initialCode={code === undefined ? undefined : cleanJoinCode(code)}
				state={previewState(query["preview-state"])}
			/>
			<ProposalNote code="U3" className="mt-6">
				Joining by code on the web is not decided. The mobile app is where observers join today.
			</ProposalNote>
		</AuthPanel>
	);
}
