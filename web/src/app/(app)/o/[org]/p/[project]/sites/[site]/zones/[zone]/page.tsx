import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ZoneScreen } from "@/features/sites/ZoneScreen";
import { getSite, getZone } from "@/fixtures";
import { loadProjectedSite } from "@/lib/plan-sites";

type Params = { org: string; project: string; site: string; zone: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
	const { project, site, zone } = await params;
	const found = getSite(project, site) ? getZone(site, zone) : undefined;
	return { title: found?.name ?? "Zone" };
}

export default async function ZonePage({ params }: { params: Promise<Params> }) {
	const { org, project, site: siteSlug, zone: zoneSlug } = await params;
	const site = getSite(project, siteSlug);
	const zone = site ? getZone(site.slug, zoneSlug) : undefined;
	if (!site || !zone) notFound();
	return <ZoneScreen org={org} site={site} zone={zone} plan={loadProjectedSite(site.geometry)} />;
}
