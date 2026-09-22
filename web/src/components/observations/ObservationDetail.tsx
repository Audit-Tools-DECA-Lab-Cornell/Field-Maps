"use client";

import { AttentionNote, Chip, EmptyState, FadeRule, FieldRow, Prose, SectionLabel } from "@/components/nocturne/chrome";
import { flagById } from "@/data/instrument";
import { ACTIVE_SITE, SITE_TIME_ZONE } from "@/data/project";
import { formatDateTime } from "@/lib/format";
import { formatCoordinate } from "@/lib/geometry";
import { RECORD_STATES } from "@/lib/states";
import type { Observation } from "@/types/domain";

/**
 * One record, read end to end. It answers three questions in order: what state is it in, what was
 * true of the round it belongs to, and what was answered — with a hidden question kept visibly
 * distinct from an unanswered one, because the export keeps them distinct too.
 */
export function ObservationDetail({ record }: { readonly record: Observation | undefined }) {
	if (record === undefined)
		return (
			<EmptyState
				title="Nothing selected"
				body="Click a marker on the map or a row in the table — the two stay in step, and the record opens here."
			/>
		);

	const badge = RECORD_STATES[record.state];
	const flag = flagById(record.flagId);
	const zone = ACTIVE_SITE.zones.find(entry => entry.id === record.zoneId);

	return (
		<div
			className="flex flex-col gap-base px-loose py-base"
			style={{ "--rule-fade": "20px" } as React.CSSProperties}>
			<div>
				<SectionLabel>Observation</SectionLabel>
				<div className="mt-tight flex flex-wrap items-baseline gap-snug">
					<h2 className="tnum text-question text-text" translate="no">
						{record.id}
					</h2>
					<Chip tone={badge.tone} glyph={badge.glyph}>
						{badge.label}
					</Chip>
					<Chip tone="muted">form {record.formVersionCode}</Chip>
					<Chip tone="muted">rev {record.revision}</Chip>
				</div>
				<Prose tone="faint" className="mt-tight text-micro">
					{badge.meaning}
				</Prose>
			</div>

			{flag !== undefined && <AttentionNote title={flag.label} body={flag.body} />}

			<FadeRule />

			<section>
				<SectionLabel>Context — the snapshot taken at collection</SectionLabel>
				<div className="mt-snug">
					<FieldRow label="Site" value={ACTIVE_SITE.name} code={ACTIVE_SITE.code} />
					<FieldRow label="Zone" value={zone?.label ?? record.zoneId} code="Env_Zone_ID" />
					<FieldRow label="Round" value={record.round} code="Rel_Round" />
					<FieldRow label="Observer" value={record.observerCode} code="Observer_Initials" />
					<FieldRow
						label="Recorded"
						value={`${formatDateTime(record.observedAt)} · ${SITE_TIME_ZONE}`}
						code="Date_Time"
					/>
					<FieldRow label="Committed" value={formatDateTime(record.receivedAt)} />
					<FieldRow
						label="Point"
						value={
							<span className="tnum" translate="no">
								{formatCoordinate(record.longitude, record.latitude)}
							</span>
						}
						code="EPSG:4326"
					/>
				</div>
			</section>

			<section>
				<SectionLabel>Answers — form {record.formVersionCode}</SectionLabel>
				<div className="mt-snug">
					{record.answers.map(answer => (
						<FieldRow
							key={answer.code}
							label={answer.label}
							code={
								answer.exportColumn === "" ? `${answer.code} · no export column` : answer.exportColumn
							}
							value={answer.value ?? "n/a"}
							muted={answer.value === null}
						/>
					))}
				</div>
				<Prose tone="faint" className="mt-snug text-micro">
					<span className="text-neutral-400">n/a</span> means the display logic hid the question at collection
					time. It is not a configured <span className="text-neutral-400">No</span> and not an unanswered
					field, and an export keeps the three apart.
				</Prose>
			</section>

			<FadeRule />

			<section>
				<SectionLabel>History</SectionLabel>
				<ol className="mt-snug flex list-none flex-col gap-snug p-0">
					{record.history.map((event, index) => (
						<li key={`${event.at}-${index}`} className="flex gap-snug">
							<span className="tnum shrink-0 text-micro text-neutral-600">
								{formatDateTime(event.at)}
							</span>
							<span className="min-w-0 text-micro text-neutral-400">{event.message}</span>
						</li>
					))}
				</ol>
			</section>
		</div>
	);
}
