import type { Metadata } from "next";

import { StubPage } from "@/features/shell/StubPage";

export const metadata: Metadata = { title: "Project settings" };

export default function Page() {
	return (
		<StubPage
			title="Project settings"
			lead="Project identity, coverage targets and analyst publication scope."
			screen="Project settings"
		/>
	);
}
