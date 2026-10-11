import type { Metadata } from "next";

import { JoinScreen } from "@/features/auth/JoinScreen";
import { readViewer } from "@/features/auth/viewer";

export const metadata: Metadata = {
	title: "Join a project",
	robots: { index: false, follow: false },
	referrer: "no-referrer"
};

/** Org 12. The join code is typed on this page and sent to DECA Mark in a request body; it is never in the address. */
export default async function JoinPage() {
	const { viewer } = await readViewer();
	return <JoinScreen viewer={viewer} />;
}
