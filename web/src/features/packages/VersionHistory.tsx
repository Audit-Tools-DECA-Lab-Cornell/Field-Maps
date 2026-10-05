"use client";

import { ButtonLink } from "@/components/contour/Button";
import { Island } from "@/components/contour/Island";
import { StateBadge } from "@/components/contour/StateBadge";
import { PreviewStateView } from "@/features/shell/PreviewStateView";
import { RowsTable } from "@/features/sites/parts";

import { type PackageRow, sizeLabel, uploadedLabel } from "./model";

/** "Version history" (project-10): every version of the site's map, newest first, with where it stands. */
export function VersionHistory({
	rows,
	selected,
	uploadHref
}: {
	rows: PackageRow[];
	/** The version in focus on this step, drawn as the selected row. */
	selected: string | null;
	uploadHref: string | null;
}) {
	return (
		<Island flush title="Version history" meta="Every observation keeps the map version it was captured on">
			<PreviewStateView
				loadingLabel="Loading package versions…"
				rows={4}
				empty={{
					actions: uploadHref ? (
						<ButtonLink href={uploadHref} icon="upload">
							Upload package
						</ButtonLink>
					) : undefined
				}}>
				{rows.length === 0 ? (
					<p className="px-island-pad py-6 type-body text-ink-2">
						No version yet. The first QGIS package you upload appears here.
					</p>
				) : (
					<RowsTable
						caption="Version history"
						rows={rows}
						rowKey={row => row.version}
						selectedKey={selected}
						cardTitle={row => <span className="type-mono-data font-semibold">{row.version}</span>}
						columns={[
							{
								key: "version",
								label: "Version",
								hideInCard: true,
								cell: row => <span className="font-semibold">{row.version}</span>,
								mono: true
							},
							{
								key: "size",
								label: "Size",
								mono: true,
								nowrap: true,
								cell: row => sizeLabel(row) ?? "—"
							},
							{ key: "uploaded", label: "Uploaded", cell: row => uploadedLabel(row) },
							{
								key: "state",
								label: "State",
								cell: row => <StateBadge kind="package" state={row.state} />
							},
							{ key: "devices", label: "On devices", cell: row => row.onDevices }
						]}
					/>
				)}
			</PreviewStateView>
		</Island>
	);
}
