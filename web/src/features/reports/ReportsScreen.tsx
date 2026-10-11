"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useId, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/contour/Button";
import { Field } from "@/components/contour/Field";
import { Island } from "@/components/contour/Island";
import { Note } from "@/components/contour/Note";
import { PageHeader } from "@/components/contour/PageHeader";
import { ScreenState } from "@/components/contour/ScreenState";
import { Select } from "@/components/contour/Select";
import { TextInput } from "@/components/contour/TextInput";
import { NotAvailable } from "@/components/shell/NotAvailable";
import { isRoundType, ROUND_TYPES, roundLabel } from "@/lib/labels";
import { clock } from "@/lib/time";
import type { RoundType } from "@/lib/workspace/types";

import { CountBars } from "./CountBars";
import {
	buildReport,
	dayRangeIsBackwards,
	inDays,
	parseDayKey,
	type PlayOptions,
	type ReportRow,
	summarySentence,
	type ZoneChoice
} from "./model";

export type ReportsScreenProps = {
	projectName: string;
	timeZone: string;
	/** When the page read its data (an ISO time). */
	loadedAt: string;
	sites: readonly { code: string; name: string }[];
	/** The site and round the list was read for ("" for all). */
	site: string;
	round: RoundType | "";
	/** The days asked for, as day keys ("2026-10-07") or "". */
	from: string;
	to: string;
	rows: readonly ReportRow[];
	zones: readonly ZoneChoice[];
	playOptions: PlayOptions;
	/** The list came back with 500 records, so older ones may be missing. */
	limited: boolean;
	/** Form versions whose definition could not be read. */
	unreadableForms: number;
};

/*
 * Printing: only the sheet prints, on A4 with 12 mm margins, in Day colours and without ledges. Everything
 * that does not hold the sheet is hidden, the sheet's ancestors drop their padding, and the sheet scales so
 * a report fits a page or two. The rule lives here, beside the one page that prints.
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

/** The page's address with these filters: only the ones that are set. */
function addressWith(pathname: string, filters: { site: string; round: string; from: string; to: string }): string {
	const query = new URLSearchParams();
	for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value);
	const text = query.toString();
	return text ? `${pathname}?${text}` : pathname;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section data-print-avoid className="min-w-0">
			<h3 className="type-mono-label text-ink-2">{title}</h3>
			<div className="mt-3">{children}</div>
		</section>
	);
}

/**
 * Reports: a summary of the observations DECA Mark holds, in one sentence and bars by zone, round, play
 * type, observer and day, that can be printed. Site and round are chosen on the server before the newest
 * 500 observations are taken; days are chosen here, so they only see the observations that came back.
 */
export function ReportsScreen({
	projectName,
	timeZone,
	loadedAt,
	sites,
	site,
	round,
	from: initialFrom,
	to: initialTo,
	rows,
	zones,
	playOptions,
	limited,
	unreadableForms
}: ReportsScreenProps) {
	const ids = useId();
	const router = useRouter();
	const pathname = usePathname();
	const [pending, startTransition] = useTransition();
	const [from, setFrom] = useState(initialFrom);
	const [to, setTo] = useState(initialTo);
	const projectClock = useMemo(() => clock(timeZone), [timeZone]);

	const fromKey = parseDayKey(from);
	const toKey = parseDayKey(to);
	const backwards = dayRangeIsBackwards(fromKey, toKey);
	const inRange = useMemo(() => inDays(rows, projectClock, fromKey, toKey), [rows, projectClock, fromKey, toKey]);
	const report = useMemo(
		() => buildReport({ rows: inRange, zones, playOptions, clock: projectClock }),
		[inRange, zones, playOptions, projectClock]
	);
	const filtered = Boolean(site || round || from || to);
	const siteName = sites.find(entry => entry.code === site)?.name;

	/** Site and round change what the list holds, so the page asks for it again. */
	function chooseOnServer(next: { site: string; round: string }) {
		startTransition(() => {
			router.replace(addressWith(pathname, { ...next, from, to }), { scroll: false });
		});
	}

	/** Days only narrow the rows already here; the address follows so the report can be shared as it is. */
	function chooseDays(next: { from: string; to: string }) {
		setFrom(next.from);
		setTo(next.to);
		window.history.replaceState(null, "", addressWith(pathname, { site, round, ...next }));
	}

	function clear() {
		setFrom("");
		setTo("");
		startTransition(() => router.replace(pathname, { scroll: false }));
	}

	const scope = [
		siteName ?? "All sites",
		round ? roundLabel(round) : "All rounds",
		fromKey && toKey
			? `${projectClock.keyLabel(fromKey)} to ${projectClock.keyLabel(toKey)}`
			: fromKey
				? `From ${projectClock.keyLabel(fromKey)}`
				: toKey
					? `Until ${projectClock.keyLabel(toKey)}`
					: "All days"
	].join(" · ");

	const nothingToCount = rows.length === 0 && !filtered;

	return (
		<div className="flex flex-col gap-6">
			<style>{PRINT_CSS}</style>
			<PageHeader
				title="Reports"
				lead="Counts of the observations DECA Mark holds, ready to print."
				actions={
					<Button
						variant="primary"
						icon="printer"
						disabled={report.total === 0}
						disabledReason={report.total === 0 ? "There is nothing to print." : undefined}
						onClick={() => window.print()}>
						Print
					</Button>
				}
			/>

			<Island aria-label="Report filters" aria-busy={pending || undefined}>
				<div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
					<Field label="Site" htmlFor={`${ids}-site`}>
						<Select
							id={`${ids}-site`}
							value={site}
							onChange={event => chooseOnServer({ site: event.target.value, round })}>
							<option value="">All sites</option>
							{sites.map(entry => (
								<option key={entry.code} value={entry.code}>
									{entry.name}
								</option>
							))}
						</Select>
					</Field>
					<Field label="Round" htmlFor={`${ids}-round`}>
						<Select
							id={`${ids}-round`}
							value={round}
							onChange={event =>
								chooseOnServer({
									site,
									round: isRoundType(event.target.value) ? event.target.value : ""
								})
							}>
							<option value="">All rounds</option>
							{ROUND_TYPES.map(type => (
								<option key={type} value={type}>
									{roundLabel(type)}
								</option>
							))}
						</Select>
					</Field>
					<Field label="First day" htmlFor={`${ids}-from`}>
						<TextInput
							id={`${ids}-from`}
							type="date"
							value={from}
							onChange={event => chooseDays({ from: event.target.value, to })}
						/>
					</Field>
					<Field
						label="Last day"
						htmlFor={`${ids}-to`}
						error={backwards ? "The last day is before the first day." : undefined}>
						<TextInput
							id={`${ids}-to`}
							type="date"
							value={to}
							onChange={event => chooseDays({ from, to: event.target.value })}
						/>
					</Field>
				</div>
				<div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
					<p className="min-w-0 max-w-prose type-small text-ink-2">
						Site and round are applied before the newest 500 observations are taken. Days are applied to the
						observations that came back, in the project&apos;s time zone, {timeZone}.
					</p>
					<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
						<p role="status" className="type-small text-ink-2">
							{report.total === rows.length
								? `${rows.length} ${rows.length === 1 ? "observation" : "observations"} counted`
								: `${report.total} of ${rows.length} observations counted`}
						</p>
						{filtered && (
							<Button variant="outline" size="sm" onClick={clear}>
								Clear filters
							</Button>
						)}
					</div>
				</div>
			</Island>

			{report.total === 0 ? (
				<Island flush divided={false}>
					{nothingToCount ? (
						<ScreenState
							kind="empty"
							icon="file-text"
							title="No observations yet"
							body="Reports count the observations observers have uploaded. Records still on devices are not counted."
						/>
					) : (
						<ScreenState
							kind="filtered"
							title="No observations match these filters"
							body={
								limited
									? "Based on the newest 500 observations. Older ones are not searched. Choose a site or a round to narrow the list."
									: "Change or clear the filters to see a report."
							}
							actions={
								<Button variant="ink" onClick={clear}>
									Clear filters
								</Button>
							}
						/>
					)}
				</Island>
			) : (
				<article
					data-report-sheet
					data-theme="day"
					aria-label="Report"
					className="mx-auto w-full max-w-270 rounded-thumb border border-line bg-island p-6 text-ink sm:p-14">
					<header className="flex flex-col gap-2 border-b-2 border-ink pb-6">
						<p className="type-mono-label text-ink-2">{projectName}</p>
						<h2 className="type-page text-ink">Observation summary</h2>
						<p className="type-body font-semibold text-ink">{scope}</p>
					</header>

					<p className="mt-6 type-section text-ink">
						{summarySentence(report, { clock: projectClock, round: round || null })}
					</p>
					{limited && (
						<Note className="mt-4" title="Based on the newest 500 observations.">
							Older observations are not counted. Choose a site or a round to narrow the list.
						</Note>
					)}
					{unreadableForms > 0 && (
						<Note className="mt-4" tone="attention" title="Some answers could not be read.">
							{unreadableForms === 1
								? "One form version could not be loaded, so its play types are not counted."
								: `${unreadableForms} form versions could not be loaded, so their play types are not counted.`}
						</Note>
					)}

					<div className="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-2">
						<Section title="By zone">
							<CountBars label="Observations by zone" rows={report.zones} />
						</Section>
						<Section title="By round">
							<CountBars label="Observations by round" rows={report.rounds} />
						</Section>
						<Section title="By play type">
							{report.play ? (
								<CountBars label="Observations by play type" rows={report.play} />
							) : (
								<p className="type-body text-ink-2">
									No form in this report has a single-choice question marked as Play, so play types
									are not counted.
								</p>
							)}
						</Section>
						<Section title="By observer">
							<CountBars label="Observations by observer" rows={report.observerBars} />
						</Section>
						<div className="md:col-span-2">
							<Section title="By day">
								<CountBars label="Observations by day" rows={report.days} />
								{report.daysLeftOut > 0 && (
									<p className="mt-3 type-small text-ink-2">
										Showing the newest {report.days.length} days.{" "}
										{report.daysLeftOut === 1
											? "1 earlier day is not shown."
											: `${report.daysLeftOut} earlier days are not shown.`}
									</p>
								)}
							</Section>
						</div>
					</div>

					<footer className="mt-10 border-t border-rule pt-4 type-small text-ink-2">
						<p>
							Data read {projectClock.dayTime(loadedAt)} · times in {timeZone}
						</p>
						<p className="mt-1">
							Form {report.formVersions.length === 1 ? "version" : "versions"}:{" "}
							<span className="type-mono-data">{report.formVersions.join(", ") || "none"}</span>
						</p>
					</footer>
				</article>
			)}

			<NotAvailable
				title="Saved report views"
				reason="A report is made from the filters on this page, and the page does not keep them."
				instead="Copy the address of this page to open the same report again."
			/>
		</div>
	);
}
