import type { ReactNode } from "react";

import { AppHeader } from "@/components/shell/AppHeader";
import { ShellMain } from "@/components/shell/ShellMain";

/** The account page (org-05): the organization header without tabs. */
export default function AccountLayout({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<>
			<AppHeader />
			<ShellMain>{children}</ShellMain>
		</>
	);
}
