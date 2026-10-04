import type { Metadata } from "next";

import { StubPage } from "@/features/shell/StubPage";

export const metadata: Metadata = { title: "Organization settings" };

export default function Page() {
	return (
		<StubPage
			title="Organization settings"
			lead="DECA Lab identity and ownership."
			screen="Organization settings"
		/>
	);
}
