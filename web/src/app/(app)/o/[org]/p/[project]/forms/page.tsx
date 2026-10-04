import type { Metadata } from "next";

import { StubPage } from "@/features/shell/StubPage";

export const metadata: Metadata = { title: "Forms" };

export default function Page() {
	return (
		<StubPage
			title="Project forms"
			lead="A draft can change. Published versions keep their original meaning."
			screen="Project forms"
		/>
	);
}
