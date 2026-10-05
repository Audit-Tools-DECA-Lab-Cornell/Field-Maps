import { activePackage, getSite, getZone } from "@/fixtures";
import { loadProjectedSite } from "@/lib/plan-sites";

import type { EditorSession } from "./DraftEditorScreen";

/**
 * The collection session the editor's preview shows: Riverside, North meadow, round 1, on the site's
 * active map package. Read on the server, so the plan's geometry never ships in the client bundle.
 */
export function previewSession(project: string): EditorSession {
	const site = getSite(project, "riverside");
	const zone = getZone("riverside", "north-meadow");
	return {
		plan: loadProjectedSite(site?.geometry ?? "riverside"),
		zoneId: zone?.id ?? "zone-a",
		siteName: site?.name ?? "Riverside",
		sessionLine: `${zone?.name ?? "North meadow"} · Round 1`,
		mapVersion: activePackage("riverside")?.version ?? "v3"
	};
}
