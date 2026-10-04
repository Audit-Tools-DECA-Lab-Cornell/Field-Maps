import type { Metadata } from "next";

import { StubPage } from "@/features/shell/StubPage";

export const metadata: Metadata = { title: "Reports" };

export default function Page() {
	return (
		<StubPage
			title="Reports and saved views"
			lead="Printable research summaries and reusable filter sets."
			screen="Reports and saved views"
		/>
	);
}
