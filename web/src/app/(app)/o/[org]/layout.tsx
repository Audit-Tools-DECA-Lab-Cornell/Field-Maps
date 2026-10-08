import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { AppHeader } from "@/components/shell/AppHeader";
import { getOrg } from "@/fixtures";

/** The organization's pages: the header for every page under /o/[org]. An unknown organization is a 404. */
export default async function OrgLayout({
	children,
	params
}: Readonly<{ children: ReactNode; params: Promise<{ org: string }> }>) {
	const { org } = await params;
	if (!getOrg(org)) notFound();
	return (
		<>
			<AppHeader />
			{children}
		</>
	);
}
