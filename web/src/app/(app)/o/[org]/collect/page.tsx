import type { Metadata } from "next";

import { ShellMain } from "@/components/shell/ShellMain";
import { CollectHandoff } from "@/features/shell/CollectHandoff";

export const metadata: Metadata = { title: "Collect on your phone" };

/** The observer handoff (proposal U3): the organization header without tabs. */
export default function CollectPage() {
	return (
		<ShellMain>
			<CollectHandoff />
		</ShellMain>
	);
}
