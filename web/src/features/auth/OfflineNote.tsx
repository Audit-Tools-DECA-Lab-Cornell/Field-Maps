import type { ReactNode } from "react";

import { Note } from "@/components/contour/Note";

/**
 * The offline state of an auth page (DESIGN.md §7): the page stays as it is, nothing is sent, and the action
 * that needs a connection is turned off with its reason under it. The body says what is safe on this page.
 */
export function OfflineNote({
	children = "Nothing you typed has been sent. It stays on this page until you are back online."
}: {
	children?: ReactNode;
}) {
	return (
		<Note tone="waiting" icon="wifi-off" title="You are offline." live="polite">
			{children}
		</Note>
	);
}
