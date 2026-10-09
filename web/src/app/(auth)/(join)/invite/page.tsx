import type { Metadata } from "next";

import { InviteScreen } from "@/features/auth/InviteScreen";
import { readViewer } from "@/features/auth/viewer";

export const metadata: Metadata = {
	title: "Invitation",
	robots: { index: false, follow: false },
	referrer: "no-referrer"
};

/**
 * Org 11. An invitation link carries its secret in the URL fragment (`/invite#t=…`), which never reaches
 * this page's request; the screen reads it in the browser. Everything that depends on who is signed in is
 * decided here, so the screen knows whether to show the invitation or ask for sign-in.
 */
export default async function InvitePage() {
	const { viewer } = await readViewer();
	return <InviteScreen viewer={viewer} />;
}
