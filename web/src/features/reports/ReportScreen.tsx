"use client";

import { Button } from "@/components/contour/Button";
import { CoverageDots } from "@/components/contour/CoverageDots";
import { FactsList } from "@/components/contour/FactsList";
import { Note } from "@/components/contour/Note";
import { PageHeader } from "@/components/contour/PageHeader";
import { StateBadge } from "@/components/contour/StateBadge";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/contour/Table";
import { TypeBars } from "@/components/contour/TypeBars";
import { MapFrame } from "@/components/map/MapFrame";
import type { PlanObservation, ZonePlanStyle } from "@/components/map/SitePlan";
import type { MarkerPosition } from "@/features/data/markers";
import { useReviews } from "@/features/data/review";
import { projectHref } from "@/features/shell/navigation";
import { usePreview } from "@/features/shell/PreviewProvider";
import { PreviewStateView } from "@/features/shell/PreviewStateView";
import { formatDay, formatDayTime, PREVIEW_NOW, type PrintableReport } from "@/fixtures";
import type { ProjectedSite } from "@/lib/plan";

import { summarise } from "./summary";

export type ReportScreenProps = {
	org: string;
	project: string;
	orgName: string;
	projectName: string;
	report: PrintableReport;
	siteName: string;
	site: ProjectedSite | null;
	positions: Record<string, MarkerPosition>;
	target: { roundsPerZone: number; observationsPerRound: number };
};

/*
 * Printing: only the sheet prints, on A4 with 12 mm margins, in Day colours and without ledges. Everything
 * that does not hold the sheet is hidden, the sheet's ancestors drop their padding, and the sheet scales so
 * a summary fits one page. The rule lives here, beside the one page that prints.
 */
const PRINT_CSS = `
@page { size: A4; margin: 12mm; }
@media print {
	:root { color-scheme: light !important; }
	html, body { background: white !important; }
	body :not(:has([data-report-sheet])):not([data-report-sheet]):not([data-report-sheet] *) { display: none !important; }
	body :has([data-report-sheet]) {
		margin: 0 !important; padding: 0 !important; gap: 0 !important; border: 0 !important;
		max-width: none !important; min-height: 0 !important; box-shadow: none !important; background: transparent !important;
	}
	[data-report-sheet] {
		max-width: none !important; margin: 0 !important; padding: 0 !important; border: 0 !important;
		box-shadow: none !important; border-radius: 0 !important; zoom: 0.8;
		print-color-adjust: exact; -webkit-print-color-adjust: exact;
	}
	[data-report-sheet] * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
	[data-report-sheet] [data-print-avoid] { break-inside: avoid; }
}
`;

/**
 * A printable summary (project-16, proposal U7): an A4 sheet in Day, whatever the screen theme, with the
 * plan, the facts, play types and coverage by zone and round for the report's scope. "Print or save as PDF"
 * opens the browser's print dialog; nothing is generated on a server.
 */
export function ReportScreen({
	org,
	project,
	orgName,
	projectName,
	report,
	siteName,
	site,
	positions,
	target
}: ReportScreenProps) {
	const { screenState } = usePreview();
	const reviews = useReviews();
	const summary = summarise({ report, project, siteName, target, review: reviews.reviewOf });
	const reportsHref = projectHref(org, project, "reports");
	const printable = screenState === "normal" || screenState === "offline";

	const markers: PlanObservation[] = summary.records.flatMap(record => {
		const position = positions[record.id];
		return position ? [{ id: record.id, ...position }] : [];
	});
	const zoneStyles: Record<string, ZonePlanStyle> | undefined = report.zoneSlug
		? Object.fromEntries(
				(site?.zones ?? []).map(zone => [
					zone.id,
					{ emphasis: summary.zones.some(entry => entry.id === zone.id) ? "focus" : "dim" } as ZonePlanStyle
				])
			)
		: undefined;

	return (
		<div className="flex flex-col gap-6">
			<style>{PRINT_CSS}</style>
			<PageHeader
				breadcrumbs={[{ label: "Reports", href: reportsHref }, { label: report.title }]}
				title={report.title}
				lead={`Report · ${formatDay(PREVIEW_NOW)} · ${summary.roundsLabel}`}
				actions={
					<Button
						icon="printer"
						disabled={!printable}
						disabledReason={printable ? undefined : "The summary has to load before it can print."}
						onClick={() => window.print()}>
						Print or save as PDF
					</Button>
				}
			/>

			<article
				data-report-sheet
				data-theme="day"
				aria-label={`${report.title}, printable summary`}
				className="mx-auto w-full max-w-270 rounded-thumb border border-line bg-island p-6 text-ink sm:p-14">
				<PreviewStateView
					loadingLabel="Loading the summary…"
					rows={6}
					headingLevel={2}
					empty={{
						icon: "file-text",
						title: "Nothing to summarise yet",
						body: "No observations in this scope have been uploaded. Records still on devices are never in a summary."
					}}>
					<header className="flex flex-col gap-4 border-b-2 border-ink pb-6 sm:flex-row sm:items-end sm:justify-between">
						<div className="min-w-0">
							<p className="type-mono-label text-ink-2">
								{orgName} · {projectName}
							</p>
							<h2 className="mt-2 type-page text-ink">Behavior mapping summary</h2>
							<p className="mt-1 type-body font-semibold text-ink">{summary.scopeLine}</p>
						</div>
						<p className="flex shrink-0 flex-col whitespace-nowrap type-mono-label text-ink-2 sm:items-end">
							<span>Report {report.id}</span>
							<span>Snapshot {formatDayTime(PREVIEW_NOW)}</span>
						</p>
					</header>

					<Note className="mt-6">
						No inference about individual children or completed study coverage is made.
					</Note>

					<div className="mt-6 grid gap-6 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]" data-print-avoid>
						<figure className="min-w-0">
							{site ? (
								<MapFrame
									site={site}
									palette="day"
									controls={false}
									surface="panel"
									mapVersion={summary.mapVersions[0] ?? "v1"}
									title={`${siteName} · Day plan`}
									observations={markers}
									zones={zoneStyles}
									// The sheet names the plan in its caption, so the frame's overlay label stays off.
									className="[&>div:not([data-map-overlay])]:hidden"
								/>
							) : (
								<div className="flex aspect-[4/3] items-center justify-center rounded-panel border border-dashed border-edge type-small text-ink-2">
									No map package for this site yet
								</div>
							)}
							<figcaption className="mt-2 type-small text-ink-2">
								{summary.records.length} observation {summary.records.length === 1 ? "point" : "points"}
								, placed by observers on the map. Not device GPS.
							</figcaption>
						</figure>
						<div className="flex min-w-0 flex-col gap-6">
							<FactsList
								labelWidth="minmax(6rem, 42%)"
								items={[
									{ label: "Observations", value: summary.records.length },
									{
										label: "Form version",
										value: summary.formVersions.join(" · ") || "None",
										mono: true
									},
									{
										label: "Map version",
										value: summary.mapVersions.join(" · ") || "None",
										mono: true
									},
									{ label: "Observers", value: summary.observers || "None" },
									{ label: "Pending offline data", value: "Not included" },
									{ label: "Review flags", value: summary.reviewFlags }
								]}
							/>
							<div>
								<p className="type-mono-label text-ink-2">By primary play type</p>
								<TypeBars className="mt-3 gap-x-4" rows={summary.types} />
							</div>
						</div>
					</div>

					<section className="mt-8" aria-labelledby="report-coverage" data-print-avoid>
						<h3 id="report-coverage" className="type-island text-ink">
							Coverage by zone and round
						</h3>
						<div className="mt-3 border-t border-rule [&_td:first-child]:pl-1 [&_td:last-child]:pr-1 [&_th:first-child]:pl-1 [&_th:last-child]:pr-1">
							<Table caption={`Coverage by zone and round, ${summary.scopeLine}`}>
								<THead>
									<tr>
										<Th>Zone</Th>
										{report.rounds.map(round => (
											<Th key={round}>Round {round}</Th>
										))}
										<Th>On target</Th>
										<Th>Status</Th>
									</tr>
								</THead>
								<TBody>
									{summary.coverage.map(row => (
										<Tr key={row.zone.slug}>
											<Td className="font-semibold">{row.zone.name}</Td>
											{report.rounds.map((round, index) => {
												const met = row.met[index] ?? false;
												const count = row.perRound[index] ?? 0;
												return (
													<Td key={round} nowrap>
														<span className="inline-flex items-center gap-2">
															<CoverageDots
																values={[met]}
																size="sm"
																label={`Round ${round}: ${count} ${count === 1 ? "observation" : "observations"}, ${met ? "met the target" : "below target"}`}
															/>
															<span aria-hidden="true" className="type-mono-data">
																{count}
															</span>
														</span>
													</Td>
												);
											})}
											<Td mono nowrap>
												{row.onTarget} / {report.rounds.length}
											</Td>
											<Td>
												<StateBadge kind="coverage" state={row.status} size="sm" />
											</Td>
										</Tr>
									))}
								</TBody>
							</Table>
						</div>
						<div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-rule pt-3 type-small text-ink">
							<span className="inline-flex items-center gap-2">
								<span aria-hidden="true">
									<CoverageDots values={[true]} size="sm" />
								</span>
								Round met the target
							</span>
							<span className="inline-flex items-center gap-2">
								<span aria-hidden="true">
									<CoverageDots values={[false]} size="sm" />
								</span>
								Round below target
							</span>
							<span>
								Target: {target.roundsPerZone} rounds per zone, {target.observationsPerRound} or more
								observations in each (illustrative)
							</span>
						</div>
						<p className="mt-4 type-small text-ink-2">
							Coverage shows rounds meeting illustrative targets, not child counts or proof of exhaustive
							observation. Field definitions accompany analytical exports.
						</p>
					</section>

					<footer className="mt-8 flex flex-wrap justify-between gap-2 border-t border-rule pt-4 type-mono-label text-ink-2">
						<span>
							FieldMaps · {projectName} · {siteName}
						</span>
						<span>Page 1 of 1</span>
					</footer>
				</PreviewStateView>
			</article>
		</div>
	);
}
