import type { Metadata } from "next";

import { StubPage } from "@/features/shell/StubPage";

export const metadata: Metadata = { title: "Members" };

export default function Page() {
	return (
		<StubPage
			title="Organization members"
			lead="Organization roles govern membership and project administration."
			screen="Organization members"
		/>
	);
}
