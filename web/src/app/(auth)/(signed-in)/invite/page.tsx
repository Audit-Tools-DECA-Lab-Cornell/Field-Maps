import type { Metadata } from "next";

import { InviteScreen } from "@/features/auth/InviteScreen";
import { cleanJoinCode, param, previewState, type SearchParams } from "@/features/auth/params";

export const metadata: Metadata = {
	title: "Invitation",
	robots: { index: false, follow: false },
	referrer: "no-referrer"
};

/**
 * Org 11. An invitation link carries its token in the URL fragment (`/invite#t=…`), which never reaches
 * this server; `?code=` comes from the join-by-code page.
 */
export default async function InvitePage({ searchParams }: { searchParams: SearchParams }) {
	const query = await searchParams;
	const code = param(query.code);
	return (
		<InviteScreen
			code={code === undefined ? undefined : cleanJoinCode(code)}
			state={previewState(query["preview-state"])}
		/>
	);
}
