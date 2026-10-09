"use client";

import { ButtonLink } from "@/components/contour/Button";
import { Icon } from "@/components/contour/Icon";
import { Island } from "@/components/contour/Island";
import { ShortcutHint } from "@/components/contour/Kbd";
import { PAGE_TITLE_ID } from "@/components/contour/PageHeader";
import { orgHref, projectHref } from "@/features/shell/navigation";
import { useWorkspace } from "@/features/shell/WorkspaceProvider";
import type { ProjectRef } from "@/lib/workspace/types";

import { PlaceRows } from "./PlaceRows";

export type NotFoundViewProps = {
	/** Inside the workspace the palette is mounted, so the page offers ⌘K. Outside it, it does not. */
	inShell?: boolean;
};

/**
 * "This page is not on the map." (org-18): what happened, the way back, and the places that do exist.
 * The organization and project come from the address when the person belongs there; otherwise from their
 * first project.
 */
export function NotFoundView({ inShell = false }: NotFoundViewProps) {
	const { index, org, project: current } = useWorkspace();
	const readable = (entry: ProjectRef) => entry.role !== "observer";
	const project =
		current && readable(current)
			? current
			: (index.projects.find(entry => entry.orgId === org?.id && readable(entry)) ??
				(org ? undefined : index.projects.find(readable)));
	const back = org ? orgHref(org.slug) : "/o";
	const base = project ? projectHref(project.orgSlug, project.code) : null;

	return (
		<div className="mx-auto grid max-w-6xl gap-10 py-8 lg:grid-cols-2 lg:gap-14 lg:py-14">
			<div className="flex flex-col items-start">
				<span className="grid size-20 place-items-center rounded-pill border border-line bg-island text-ink shadow-ledge">
					<Icon name="map" size={32} />
				</span>
				<p className="mt-8 type-mono-label text-ink-2">Page not found</p>
				<h1 id={PAGE_TITLE_ID} tabIndex={-1} className="mt-2 type-page text-ink md:type-hero">
					This page is not on the map.
				</h1>
				<p className="mt-4 max-w-xl type-lead text-ink-2">
					The link may be outdated or the page may have moved. Return to your projects to continue.
				</p>
				<ButtonLink href={back} variant="primary" icon="arrow-left" className="mt-8">
					Return to projects
				</ButtonLink>
				{inShell && (
					<p className="mt-5 type-small text-ink-2">
						Or press <ShortcutHint /> to search and jump anywhere.
					</p>
				)}
			</div>
			{project && base && (
				<Island flush title="Places that do exist" className="self-start lg:mt-14">
					<PlaceRows
						rows={[
							{
								href: base,
								icon: "layout-grid",
								title: `${project.name} overview`,
								detail: "What came back from the field"
							},
							{
								href: `${base}/data`,
								icon: "table",
								title: "Observation data",
								detail: "Map, table and export"
							},
							{ href: `${base}/sites`, icon: "map", title: "Sites", detail: "Maps, zones and packages" },
							{
								href: `${base}/forms`,
								icon: "file-text",
								title: "Forms",
								detail: "Drafts and published versions"
							}
						]}
					/>
				</Island>
			)}
		</div>
	);
}
