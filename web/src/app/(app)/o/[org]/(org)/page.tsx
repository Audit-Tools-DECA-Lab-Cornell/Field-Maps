import type { Metadata } from "next";

import { YourProjects } from "@/features/org/projects/YourProjects";

export const metadata: Metadata = { title: "Your projects" };

export default async function OrgHomePage({ params }: { params: Promise<{ org: string }> }) {
	const { org } = await params;
	return <YourProjects org={org} />;
}
