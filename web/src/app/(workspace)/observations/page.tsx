import { Suspense } from "react";

import { ObservationsWorkspace } from "@/components/observations/ObservationsWorkspace";

export const metadata = { title: "Observations" };

export default function ObservationsPage() {
	return (
		<Suspense fallback={<div className="flex-1 bg-bg" />}>
			<ObservationsWorkspace />
		</Suspense>
	);
}
