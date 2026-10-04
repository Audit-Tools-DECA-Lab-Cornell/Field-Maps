import type { Metadata } from "next";

import { StubPage } from "@/features/shell/StubPage";

export const metadata: Metadata = { title: "Sites" };

export default function Page() {
	return <StubPage title="Sites" lead="Places in this project, each with versioned maps and zones." screen="Sites" />;
}
