"use client";

import { useId, useRef, useState } from "react";

import { Button } from "@/components/contour/Button";
import { FactsList } from "@/components/contour/FactsList";
import { Island, IslandSection } from "@/components/contour/Island";
import { Note } from "@/components/contour/Note";
import { StateBadge } from "@/components/contour/StateBadge";
import { Textarea } from "@/components/contour/Textarea";
import { useToast } from "@/components/contour/Toast";
import { usePreview } from "@/features/shell/PreviewProvider";
import { PreviewStateView } from "@/features/shell/PreviewStateView";
import type { Observation, Site, Zone, ZoneCoverage } from "@/fixtures";

import { roundsPhrase, targetFact } from "./model";
import { Eyebrow, LinkButton } from "./parts";
import { descriptionKey, sitesStore, useSitesPreview } from "./store";

const MAX_DESCRIPTION = 400;

/**
 * "Zone context" (project-08): the zone's description, which a manager can edit in place for this
 * preview, its facts, and the reminder that the coverage target is illustrative.
 */
export function ZoneContext({
	site,
	zone,
	coverage,
	records,
	mapVersion,
	vertices
}: {
	site: Site;
	zone: Zone;
	coverage: ZoneCoverage | undefined;
	records: Observation[];
	mapVersion: string;
	vertices: number;
}) {
	const { can, offline } = usePreview();
	const toast = useToast();
	const { descriptions } = useSitesPreview();
	const key = descriptionKey(site.slug, zone.slug);
	const description = descriptions[key] ?? zone.description;
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(description);
	const [error, setError] = useState<string | null>(null);
	const editRef = useRef<HTMLButtonElement>(null);
	const fieldId = useId();
	const mayEdit = can("uploadPackage");

	const rounds = coverage?.met.length ?? 0;
	const onTarget = coverage?.onTarget ?? 0;
	const metaState = onTarget === rounds && rounds > 0 ? "complete" : onTarget === 0 ? "below" : "roundBelow";

	function startEditing() {
		setDraft(description);
		setError(null);
		setEditing(true);
	}

	function stopEditing() {
		setEditing(false);
		setError(null);
		// Back to the control that opened the editor, so the keyboard reader keeps their place.
		requestAnimationFrame(() => editRef.current?.focus());
	}

	function save() {
		const text = draft.trim();
		if (!text) {
			setError("Enter a short description, or cancel to keep the current one.");
			return;
		}
		const previous = sitesStore.get().descriptions[key];
		sitesStore.set(current => {
			const next = { ...current.descriptions };
			if (text === zone.description) delete next[key];
			else next[key] = text;
			return { ...current, descriptions: next };
		});
		stopEditing();
		toast({
			title: "Description saved for this preview",
			action: {
				label: "Undo",
				onClick: () =>
					sitesStore.set(current => {
						const next = { ...current.descriptions };
						if (previous === undefined) delete next[key];
						else next[key] = previous;
						return { ...current, descriptions: next };
					})
			}
		});
	}

	const observationsFact =
		records.length === 0
			? "None yet"
			: `${records.length} across ${roundsPhrase(records.map(record => record.round))}`;

	return (
		<Island
			flush
			divided
			title="Zone context"
			meta={
				coverage ? (
					<StateBadge
						kind="coverage"
						state={metaState}
						label={`${onTarget} of ${rounds} rounds on target`}
						size="sm"
					/>
				) : undefined
			}>
			<PreviewStateView loadingLabel="Loading the zone…" rows={3}>
				<IslandSection className="flex flex-col gap-2 py-5">
					<Eyebrow>Description</Eyebrow>
					{editing ? (
						<div className="flex flex-col gap-3">
							<label htmlFor={fieldId} className="sr-only">
								Description of {zone.name}
							</label>
							<Textarea
								id={fieldId}
								value={draft}
								maxLength={MAX_DESCRIPTION}
								showCount
								autoFocus
								invalid={error !== null}
								aria-describedby={error ? `${fieldId}-error` : undefined}
								onChange={event => {
									setDraft(event.target.value);
									if (error) setError(null);
								}}
								onKeyDown={event => {
									if (event.key === "Escape") {
										event.preventDefault();
										stopEditing();
									}
								}}
							/>
							{error && (
								<p
									id={`${fieldId}-error`}
									role="alert"
									className="type-small font-semibold text-attention">
									{error}
								</p>
							)}
							<div className="flex flex-wrap items-center gap-3">
								<Button variant="ink" icon="check" size="sm" onClick={save}>
									Save description
								</Button>
								<Button variant="outline" size="sm" onClick={stopEditing}>
									Cancel
								</Button>
							</div>
						</div>
					) : (
						<>
							<p className="type-body text-ink">{description}</p>
							{mayEdit && (
								<div>
									<LinkButton
										ref={editRef}
										icon="pencil"
										onClick={startEditing}
										disabled={offline}
										aria-describedby={offline ? `${fieldId}-offline` : undefined}>
										Edit description
									</LinkButton>
									{offline && (
										<p id={`${fieldId}-offline`} className="mt-1 type-small text-ink-2">
											You are offline. The description can be edited once the connection returns.
										</p>
									)}
								</div>
							)}
						</>
					)}
				</IslandSection>
				<IslandSection rule className="flex flex-col gap-5 pt-5 pb-island-pad">
					<FactsList
						labelWidth="9.5rem"
						items={[
							{ label: "Zone ID", value: zone.id, mono: true },
							{ label: "Map version", value: mapVersion, mono: true },
							{
								label: "Geometry",
								value: `Polygon from the package, ${vertices} ${vertices === 1 ? "vertex" : "vertices"}`
							},
							{ label: "Target", value: targetFact(site.projectSlug) },
							{ label: "Observations", value: observationsFact }
						]}
					/>
					<Note>
						The target is illustrative. It is not a scheduled assignment or a claim of complete participant
						coverage.
					</Note>
				</IslandSection>
			</PreviewStateView>
		</Island>
	);
}
