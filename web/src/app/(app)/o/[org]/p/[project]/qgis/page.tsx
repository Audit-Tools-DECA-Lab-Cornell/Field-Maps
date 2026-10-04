import type { Metadata } from "next";

import { StubPage } from "@/features/shell/StubPage";

export const metadata: Metadata = { title: "QGIS" };

export default function Page() {
	return (
		<StubPage
			title="QGIS · maps in, evidence out"
			lead="Two directions. One set of versioned research records."
			screen="QGIS"
		/>
	);
}
