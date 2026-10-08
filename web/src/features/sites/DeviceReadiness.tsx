"use client";

import type { ReactNode } from "react";

import { Avatar } from "@/components/contour/Avatar";
import { Island } from "@/components/contour/Island";
import { StateBadge } from "@/components/contour/StateBadge";
import { PreviewStateView } from "@/features/shell/PreviewStateView";

import { observersLine, type ReadinessRow, readinessRows } from "./model";
import { type Column, RowsTable } from "./parts";

const FOOTNOTE =
	"An offline device cannot report its current state. Ready has to be verified on the device itself; this roster shows only each device’s last report.";

function Observer({ row }: { row: ReadinessRow }) {
	return (
		<span className="flex items-center gap-3">
			<Avatar initials={row.person.initials} size="sm" />
			<span>{row.person.name}</span>
		</span>
	);
}

/**
 * "Device readiness, as last reported" (project-07): each observer's last device report for the site.
 * Nothing here is live; an offline device cannot report, so the roster never claims a device is ready.
 * `extra` adds a column, such as the newly active version on the Download step.
 */
export function DeviceReadiness({
	siteSlug,
	title = "Device readiness, as last reported",
	extra,
	footnote = FOOTNOTE
}: {
	siteSlug: string;
	title?: string;
	extra?: { label: string; cell: (row: ReadinessRow) => ReactNode };
	footnote?: string;
}) {
	const rows = readinessRows(siteSlug);
	const columns: Column<ReadinessRow>[] = [
		{ key: "observer", label: "Observer", cell: row => <Observer row={row} />, hideInCard: true },
		...(extra ? [{ key: "extra", label: extra.label, cell: extra.cell }] : []),
		{
			key: "map",
			label: extra ? "Current map" : "Map package",
			cell: row => <StateBadge kind="readiness" state={row.mapPackage.state} label={row.mapPackage.label} />
		},
		{
			key: "form",
			label: "Form",
			cell: row => <StateBadge kind="readiness" state={row.form.state} label={row.form.label} />
		},
		{ key: "checked", label: "Last checked", cell: row => row.lastChecked }
	];

	return (
		<Island flush title={title} meta={observersLine(rows.length)} footnote={rows.length > 0 ? footnote : undefined}>
			<PreviewStateView
				loadingLabel="Loading device reports…"
				rows={3}
				empty={{
					icon: "smartphone",
					title: "No device has reported this site yet",
					body: "A device reports its map package and form once it has downloaded the site and gone online."
				}}>
				{rows.length === 0 ? (
					<p className="px-island-pad py-6 type-body text-ink-2">
						No device has reported this site yet. A device reports once it has downloaded the site and gone
						online.
					</p>
				) : (
					<RowsTable
						caption={title}
						columns={columns}
						rows={rows}
						rowKey={row => row.person.id}
						cardTitle={row => <Observer row={row} />}
					/>
				)}
			</PreviewStateView>
		</Island>
	);
}
