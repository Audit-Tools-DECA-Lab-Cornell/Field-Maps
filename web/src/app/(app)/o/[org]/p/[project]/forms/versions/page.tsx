import type { Metadata } from "next";

import { FormVersionsScreen } from "@/features/forms/FormVersionsScreen";

export const metadata: Metadata = { title: "Form versions" };

/** Form versions (project-12): the history, the immutability contract and Janet's protocol notes. */
export default async function FormVersionsPage({ params }: { params: Promise<{ org: string; project: string }> }) {
	const { org, project } = await params;
	return <FormVersionsScreen org={org} project={project} />;
}
