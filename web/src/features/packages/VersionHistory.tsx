"use client";

import { Island } from "@/components/contour/Island";
import { ScreenState } from "@/components/contour/ScreenState";
import { StateBadge } from "@/components/contour/StateBadge";
import { TextLink } from "@/components/contour/TextLink";
import { RowsTable } from "@/features/sites/parts";
import { plural } from "@/lib/labels";

import type { HistoryRow } from "./history";

function StateOf({ row }: { row: HistoryRow }) {
	if (row.state === "current") return <StateBadge kind="package" state="active" />;
	if (row.state === "archived") return <StateBadge kind="package" state="archived" />;
	return <StateBadge kind="check" state="fails" />;
}

function Notes({ row, currentVersion }: { row: HistoryRow; currentVersion: number | null }) {
	if (row.state === "current") return <span>Observers get this version.</span>;
	if (row.state === "archived")
		return (
			<span className="text-ink-2">{currentVersion ? `Replaced by v${currentVersion}.` : "Older version."}</span>
		);
	return (
		<span>
			{row.blockedDetail ? `${row.blockedDetail} ` : ""}
			<span className="text-ink-2">It cannot be downloaded.</span>
		</span>
	);
}

/**
 * Version history: every map package prepared for the site, newest first. The newest ready one is current
 * and Active; older ready ones are Archived; a blocked one fails, with the first reason it was blocked.
 */
export function VersionHistory({
	rows,
	selectedId,
	inspectHref
}: {
	rows: HistoryRow[];
	/** The package open in Inspect, drawn as the selected row. */
	selectedId: string | null;
	/** The address that opens one package in Inspect. */
	inspectHref: (packageId: string) => string;
}) {
	const currentVersion = rows.find(row => row.state === "current")?.version ?? null;
	return (
		<Island flush title="History" meta={plural(rows.length, "version")}>
			{rows.length === 0 ? (
				<ScreenState
					kind="empty"
					icon="layers"
					headingLevel={3}
					title="No map packages yet"
					body="The first package you upload becomes this site's map. Each upload after it is a new version."
				/>
			) : (
				<RowsTable
					caption="Map package versions, newest first"
					rows={rows}
					rowKey={row => row.packageId}
					selectedKey={selectedId}
					cardTitle={row => (
						<TextLink href={inspectHref(row.packageId)} tone="ink" className="type-mono-data font-semibold">
							v{row.version}
						</TextLink>
					)}
					columns={[
						{
							key: "version",
							label: "Version",
							hideInCard: true,
							mono: true,
							nowrap: true,
							cell: row => (
								<TextLink href={inspectHref(row.packageId)} tone="ink" className="font-semibold">
									v{row.version}
								</TextLink>
							)
						},
						{ key: "state", label: "State", cell: row => <StateOf row={row} /> },
						{ key: "prepared", label: "Prepared", nowrap: true, cell: row => row.prepared },
						{ key: "size", label: "Size", mono: true, nowrap: true, cell: row => row.sizeLabel },
						{
							key: "form",
							label: "Form version",
							mono: true,
							cell: row => <span className="break-all">{row.formVersion}</span>
						},
						{
							key: "notes",
							label: "Notes",
							cell: row => <Notes row={row} currentVersion={currentVersion} />
						}
					]}
				/>
			)}
		</Island>
	);
}
