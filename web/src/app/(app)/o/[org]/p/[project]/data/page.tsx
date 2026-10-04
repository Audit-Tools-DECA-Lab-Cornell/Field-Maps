import type { Metadata } from "next";

import { StubPage } from "@/features/shell/StubPage";

export const metadata: Metadata = { title: "Observation data" };

export default function Page() {
	return (
		<StubPage
			title="Observation data"
			lead="One filter set for the map, table and export."
			screen="Observation data"
		/>
	);
}
