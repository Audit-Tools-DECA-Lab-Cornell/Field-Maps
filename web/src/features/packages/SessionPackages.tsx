"use client";

import { SessionSiteGate } from "@/features/sites/SessionSite";

import type { PackageStep } from "./model";
import { PackagesScreen } from "./PackagesScreen";

/** Map packages for a site made in this preview: no versions yet, so the page opens on the Upload step. */
export function SessionPackagesPage({
	org,
	project,
	slug,
	step
}: {
	org: string;
	project: string;
	slug: string;
	step: PackageStep | undefined;
}) {
	return (
		<SessionSiteGate org={org} project={project} slug={slug}>
			{site => (
				<PackagesScreen
					org={org}
					project={project}
					site={{ slug: site.slug, name: site.name }}
					plan={null}
					step={step}
				/>
			)}
		</SessionSiteGate>
	);
}
