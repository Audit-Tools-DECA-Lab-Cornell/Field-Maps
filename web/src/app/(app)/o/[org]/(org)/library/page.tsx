import type { Metadata } from "next";

import { StubPage } from "@/features/shell/StubPage";

export const metadata: Metadata = { title: "Form library" };

export default function Page() {
	return (
		<StubPage
			title="Form template library"
			lead="Reusable questions and templates. Using a template creates an independent project draft."
			screen="Form template library"
		/>
	);
}
