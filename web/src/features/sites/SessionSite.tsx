"use client";

import { type ReactNode, useSyncExternalStore } from "react";

import { Button, ButtonLink } from "@/components/contour/Button";
import { Island } from "@/components/contour/Island";
import { PageHeader } from "@/components/contour/PageHeader";
import { ScreenState } from "@/components/contour/ScreenState";
import { projectHref } from "@/features/shell/navigation";
import { usePreview } from "@/features/shell/PreviewProvider";

import { type CreatedSite, useSitesPreview } from "./store";

const subscribeNothing = () => () => {};

/** True once the page has hydrated, so session-only sites can be looked up. */
export function useHydrated(): boolean {
	return useSyncExternalStore(
		subscribeNothing,
		() => true,
		() => false
	);
}

/**
 * Resolves a site that exists only in this preview (made with "Create site"). Before hydration nothing is
 * known, so the page holds still; afterwards an unknown address says so in place, inside the shell.
 */
export function SessionSiteGate({
	org,
	project,
	slug,
	children
}: {
	org: string;
	project: string;
	slug: string;
	children: (site: CreatedSite) => ReactNode;
}) {
	const hydrated = useHydrated();
	const { created } = useSitesPreview();
	const sitesHref = projectHref(org, project, "sites");
	if (!hydrated) return null;
	const site = created.find(entry => entry.slug === slug && entry.projectSlug === project);
	if (site) return children(site);
	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				breadcrumbs={[{ label: "Sites", href: sitesHref }, { label: "Not found" }]}
				title="Site not found"
			/>
			<Island flush>
				<ScreenState
					kind="empty"
					icon="map"
					headingLevel={2}
					title="This site is not in this project"
					body="The link may be outdated, or the site was created in another preview session. Nothing was removed."
					actions={
						<ButtonLink href={sitesHref} variant="ink" icon="arrow-left">
							Return to sites
						</ButtonLink>
					}
				/>
			</Island>
		</div>
	);
}

/** A site made in this preview: it has no map package yet, so the page is the designed empty state. */
export function SessionSiteScreen({ org, site }: { org: string; site: CreatedSite }) {
	const { can, offline } = usePreview();
	const base = projectHref(org, site.projectSlug, `sites/${site.slug}`);
	const mayUpload = can("uploadPackage") && !offline;

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				breadcrumbs={[
					{ label: "Sites", href: projectHref(org, site.projectSlug, "sites") },
					{ label: site.name }
				]}
				title={site.name}
				lead="Zones, coverage, map packages and download readiness."
				actions={
					<ButtonLink href={`${base}/packages`} variant="outline" icon="layers">
						Map packages
					</ButtonLink>
				}
			/>
			<Island flush title="Zones and coverage">
				<ScreenState
					kind="empty"
					actions={
						mayUpload ? (
							<ButtonLink href={`${base}/packages?step=upload`} icon="upload">
								Upload package
							</ButtonLink>
						) : (
							<Button
								icon="upload"
								disabled
								disabledReason={
									offline
										? "You are offline. Packages can be uploaded once the connection returns."
										: "Only project managers can upload map packages."
								}>
								Upload package
							</Button>
						)
					}
				/>
			</Island>
		</div>
	);
}

/** The site page for an address that is not a fixture site: a site made in this preview, or not found. */
export function SessionSitePage({ org, project, slug }: { org: string; project: string; slug: string }) {
	return (
		<SessionSiteGate org={org} project={project} slug={slug}>
			{site => <SessionSiteScreen org={org} site={site} />}
		</SessionSiteGate>
	);
}
