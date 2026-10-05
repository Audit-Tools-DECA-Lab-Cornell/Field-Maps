import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ZoneEditorScreen } from "@/features/sites/ZoneEditor";
import { getSite } from "@/fixtures";
import { loadProjectedSite } from "@/lib/plan-sites";

export const metadata: Metadata = { title: "Edit zone boundaries" };

type Params = { org: string; project: string; site: string };

export default async function EditZonesPage({
	params,
	searchParams
}: {
	params: Promise<Params>;
	searchParams: Promise<{ zone?: string | string[] }>;
}) {
	const [{ org, project, site: slug }, { zone }] = await Promise.all([params, searchParams]);
	const site = getSite(project, slug);
	if (!site) notFound();
	return (
		<ZoneEditorScreen
			org={org}
			site={site}
			plan={loadProjectedSite(site.geometry)}
			initialZone={typeof zone === "string" ? zone : undefined}
		/>
	);
}
