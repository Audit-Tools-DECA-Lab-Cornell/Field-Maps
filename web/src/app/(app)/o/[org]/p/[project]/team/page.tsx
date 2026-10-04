import type { Metadata } from "next";

import { StubPage } from "@/features/shell/StubPage";

export const metadata: Metadata = { title: "Team" };

export default function Page() {
	return (
		<StubPage
			title="Project team"
			lead="Project roles govern collection, review and reader access."
			screen="Project team"
		/>
	);
}
