"use client";

import Link from "next/link";

import { CoverageDots } from "@/components/contour/CoverageDots";
import { Icon } from "@/components/contour/Icon";
import { Island } from "@/components/contour/Island";
import { StateBadge } from "@/components/contour/StateBadge";
import { projectHref } from "@/features/shell/navigation";
import { PreviewStateView } from "@/features/shell/PreviewStateView";
import { cx } from "@/lib/cx";

import { type ProjectRow, projectRows } from "./rows";

function Column({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex min-w-0 flex-col gap-1">
			<dt className="type-mono-label text-ink-2">{label}</dt>
			<dd className="type-body text-ink">{children}</dd>
		</div>
	);
}

function Coverage({ coverage }: { coverage: ProjectRow["coverage"] }) {
	if (coverage.kind === "text") return coverage.text;
	return (
		<span className="inline-flex items-center gap-3">
			<CoverageDots
				values={coverage.dots}
				layout="grid"
				columns={3}
				label={`${coverage.met} of ${coverage.total} zone rounds met the target`}
			/>
			<span aria-hidden="true" className="whitespace-nowrap">
				{coverage.met} of {coverage.total}
			</span>
		</span>
	);
}

function Row({ org, row }: { org: string; row: ProjectRow }) {
	const { project } = row;
	return (
		<li
			className={cx(
				"relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-4 px-island-pad py-6",
				"lg:grid-cols-[minmax(0,1fr)_auto_auto]",
				"transition-[background-color] duration-(--ct-duration-quick) ease-standard hover:bg-well",
				// The row's link covers it; its focus ring is drawn around the whole row, inset 3 px.
				"has-[a:focus-visible]:[outline:var(--ct-size-focus-ring)_solid_var(--ct-focus)] has-[a:focus-visible]:[outline-offset:calc(var(--ct-size-focus-ring)*-2)]"
			)}>
			<div className="col-start-1 row-start-1 min-w-0">
				<h2 className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
					<Link
						href={projectHref(org, project.slug)}
						className="type-section text-ink [--ct-size-focus-ring:0px] before:absolute before:inset-0">
						{project.name}
					</Link>
					<StateBadge kind="project" state={project.state} />
				</h2>
				<p className="mt-1 type-body text-ink-2">{project.summary}</p>
			</div>
			<dl className="col-span-2 row-start-2 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:grid-cols-[repeat(4,8.5rem)] xl:grid-cols-[repeat(4,9.25rem)]">
				<Column label="Sites">
					<span className="type-mono-data">{row.sites}</span>
				</Column>
				<Column label="Observations">
					{row.observations === null ? (
						"Not counted"
					) : (
						<span className="type-mono-data">{row.observations}</span>
					)}
				</Column>
				<Column label="Your role">{row.role}</Column>
				<Column label="Coverage">
					<Coverage coverage={row.coverage} />
				</Column>
			</dl>
			<Icon name="chevron-right" size={20} className="col-start-2 row-start-1 shrink-0 text-ink lg:col-start-3" />
		</li>
	);
}

/** The organization's projects as one island of link rows (org-01). The island honours the preview state. */
export function ProjectList({ org }: { org: string }) {
	const rows = projectRows(org);
	return (
		<Island flush aria-label="Projects">
			<PreviewStateView
				loadingLabel="Loading projects…"
				rows={3}
				headingLevel={2}
				empty={{
					icon: "folder",
					title: "No projects yet",
					body: "A project holds its own sites, forms, team and QGIS access. Create the first one to start."
				}}
				filtered={{
					title: "No projects match this view",
					body: "Change your filters to see more projects. Your projects are unchanged."
				}}
				error={{ body: "Nothing was removed. Check your connection and try again." }}>
				<ul className="divide-y divide-rule">
					{rows.map(row => (
						<Row key={row.project.slug} org={org} row={row} />
					))}
				</ul>
			</PreviewStateView>
		</Island>
	);
}
