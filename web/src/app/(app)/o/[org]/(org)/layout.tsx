import type { ReactNode } from "react";

import { ShellMain, ShellTabsRow } from "@/components/shell/ShellMain";
import { OrgTabs } from "@/components/shell/WorkspaceTabs";
import { AccessGate } from "@/features/shell/AccessGate";

/** The organization pages: Projects · Members · Form library · Settings. */
export default async function OrgPagesLayout({
	children,
	params
}: Readonly<{ children: ReactNode; params: Promise<{ org: string }> }>) {
	const { org } = await params;
	return (
		<>
			<ShellTabsRow>
				<OrgTabs org={org} />
			</ShellTabsRow>
			<ShellMain afterTabs>
				<AccessGate>{children}</AccessGate>
			</ShellMain>
		</>
	);
}
