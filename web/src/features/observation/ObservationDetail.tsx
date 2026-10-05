"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef } from "react";

import { Button } from "@/components/contour/Button";
import { FactsList } from "@/components/contour/FactsList";
import { Island } from "@/components/contour/Island";
import { PageHeader } from "@/components/contour/PageHeader";
import { StateBadge } from "@/components/contour/StateBadge";
import { TextLink } from "@/components/contour/TextLink";
import { Timeline, type TimelineItem } from "@/components/contour/Timeline";
import { useToast } from "@/components/contour/Toast";
import { MapFrame } from "@/components/map/MapFrame";
import type { PlanObservation } from "@/components/map/SitePlan";
import { zoneName } from "@/features/data/filters";
import { markerLabel, type MarkerPosition } from "@/features/data/markers";
import { REVIEW_VERB, useReviews } from "@/features/data/review";
import { decisionReason, type ReviewAccess } from "@/features/data/SelectedRecord";
import { projectHref } from "@/features/shell/navigation";
import { usePreview } from "@/features/shell/PreviewProvider";
import { PreviewStateView } from "@/features/shell/PreviewStateView";
import {
	formatDayTime,
	formatTime,
	type HistoryEvent,
	type Observation,
	observationsFor,
	personByInitials,
	type ReviewState
} from "@/fixtures";
import type { ProjectedSite } from "@/lib/plan";
import { isOverlayOpen, isTypingTarget } from "@/lib/shortcuts";

export type ObservationDetailProps = {
	org: string;
	project: string;
	id: string;
	site: ProjectedSite | null;
	siteName: string;
	siteSlug: string;
	positions: Record<string, MarkerPosition>;
};

const OFFLINE_REASON = "You are offline. Changes cannot be saved.";
const VIEWER_REASON = "Your role can read observations. A project manager approves or excludes them.";

const REVIEW_DETAIL = "Approve or exclude decides analyst visibility under the Approved-only scope.";

/** The record's history, with this session's review decision in place of the stored one. */
function historyOf(record: Observation, review: ReviewState, decided: boolean): TimelineItem[] {
	const events: HistoryEvent[] = (record.history ?? []).filter(event => !event.title.startsWith("Review:"));
	const stored = (record.history ?? []).find(event => event.title.startsWith("Review:"));
	const reviewEvent: HistoryEvent =
		decided || !stored
			? {
					tone: review === "approved" ? "saved" : review === "excluded" ? "attention" : "waiting",
					title: review === "notReviewed" ? "Review: not yet reviewed" : `Review: ${REVIEW_VERB[review]}`,
					detail: decided ? `${REVIEW_DETAIL} Decided in this preview.` : REVIEW_DETAIL,
					time: "Now"
				}
			: stored;
	return [...events, reviewEvent].map((event, index) => ({ ...event, id: `${index}-${event.title}` }));
}

/**
 * One observation (project-03): where it was placed, the context it was captured in, every answer the
 * observer saw, and its history. Approve and Exclude change this preview session only.
 */
export function ObservationDetail({ org, project, id, site, siteName, siteSlug, positions }: ObservationDetailProps) {
	const router = useRouter();
	const { toast, dismiss } = useToast();
	const { offline, can } = usePreview();
	const reviews = useReviews();
	const reasonId = useId();
	const records = observationsFor(project);
	const record = records.find(entry => entry.id === id)!;
	const review = reviews.reviewOf(record);
	const decided = record.id in reviews.overrides;
	const observer = personByInitials(record.observerInitials);
	const base = projectHref(org, project);
	const zone = zoneName(record.zoneSlug);
	const lastDecision = useRef<{ previous: ReviewState; toastId: string } | null>(null);

	const access: ReviewAccess = offline
		? { allowed: false, reason: OFFLINE_REASON }
		: can("editProject")
			? { allowed: true }
			: { allowed: false, reason: VIEWER_REASON };
	const reason = decisionReason(review, access);

	function undo() {
		const last = lastDecision.current;
		if (!last) return;
		lastDecision.current = null;
		dismiss(last.toastId);
		reviews.setReview(record, last.previous);
	}

	function decide(next: "approved" | "excluded") {
		if (!access.allowed || reviews.reviewOf(record) === next) return;
		const previous = reviews.setReview(record, next);
		const toastId = toast({
			title: `${record.id} ${REVIEW_VERB[next]}`,
			action: { label: "Undo", onClick: undo, altText: "Undo with Command Z or Control Z" }
		});
		lastDecision.current = { previous, toastId };
	}
	// The key handler always calls the latest decide and undo.
	const handlers = useRef({ decide, undo });
	useEffect(() => {
		handlers.current = { decide, undo };
	});

	// a approves, x excludes and ⌘Z undoes here too, as on Data.
	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (event.defaultPrevented || isTypingTarget(event.target) || isOverlayOpen()) return;
			const mod = event.metaKey || event.ctrlKey;
			if (mod && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "z" && lastDecision.current) {
				event.preventDefault();
				handlers.current.undo();
				return;
			}
			if (mod || event.altKey) return;
			if (event.key === "a") handlers.current.decide("approved");
			if (event.key === "x") handlers.current.decide("excluded");
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	const markers: PlanObservation[] = records.flatMap(entry => {
		const position = positions[entry.id];
		return position ? [{ id: entry.id, ...position, label: markerLabel(entry) }] : [];
	});

	const approveOff = !access.allowed || review === "approved";
	const excludeOff = !access.allowed || review === "excluded";
	const answers = record.answers ?? [];

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				breadcrumbs={[{ label: "Data", href: `${base}/data` }, { label: record.id }]}
				title={record.id}
				titleMono
				titleAddon={
					<>
						{record.uploadedAt && (
							<StateBadge
								kind="queue"
								state="uploaded"
								label={`Uploaded ${formatTime(record.uploadedAt)}`}
							/>
						)}
						<StateBadge
							kind="review"
							state={review}
							className="transition-[color] duration-(--ct-duration-quick) ease-standard"
						/>
					</>
				}
				lead="Original capture context, answers and review history."
				actions={
					<div className="flex flex-col items-start gap-2 md:items-end">
						<div className="flex flex-wrap items-center gap-3">
							<Button
								variant="outline"
								icon="x"
								disabled={excludeOff}
								aria-describedby={excludeOff && reason ? reasonId : undefined}
								aria-keyshortcuts="x"
								onClick={() => decide("excluded")}>
								{review === "excluded" ? "Excluded" : "Exclude"}
							</Button>
							{/* One magenta action: once approved, Approve steps back to a disabled outline. */}
							<Button
								variant={review === "approved" ? "outline" : "primary"}
								icon="check"
								disabled={approveOff}
								aria-describedby={approveOff && reason ? reasonId : undefined}
								aria-keyshortcuts="a"
								onClick={() => decide("approved")}>
								{review === "approved" ? "Approved" : "Approve"}
							</Button>
						</div>
						{reason && (
							<p id={reasonId} className="type-small text-ink-2">
								{reason}
							</p>
						)}
					</div>
				}
			/>

			<div className="grid gap-6 lg:grid-cols-[minmax(0,54fr)_minmax(0,46fr)] lg:items-start">
				<div className="flex min-w-0 flex-col gap-6">
					{site && (
						<MapFrame
							site={site}
							className="shadow-ledge"
							mapVersion={record.mapVersion}
							title={record.id}
							subtitle={`${zone} · Round ${record.round}`}
							observations={markers}
							selectedId={record.id}
							onSelectObservation={next => {
								if (next !== record.id) router.push(`${base}/data/${next}`);
							}}
						/>
					)}
					<Island flush title="Capture context">
						<PreviewStateView loadingLabel="Loading the capture context…" rows={6} headingLevel={3}>
							<FactsList
								className="px-island-pad py-4"
								labelWidth="minmax(7rem, 28%)"
								items={[
									{
										label: "Site",
										value: (
											<TextLink tone="ink" href={`${base}/sites/${siteSlug}`}>
												{siteName}
											</TextLink>
										)
									},
									{
										label: "Zone",
										value: (
											<TextLink
												tone="ink"
												href={`${base}/sites/${siteSlug}/zones/${record.zoneSlug}`}>
												{zone}
											</TextLink>
										)
									},
									{ label: "Round", value: String(record.round) },
									{
										label: "Observer",
										value: observer
											? `${record.observerInitials} · ${observer.name}`
											: record.observerInitials
									},
									{
										label: "Captured",
										value: `${formatDayTime(record.capturedAt)} · stored on the device first`
									},
									{
										label: "Form version",
										value: (
											<>
												<span className="type-mono-data">{record.formVersion}</span> · the
												wording this observer saw
											</>
										)
									},
									{
										label: "Map version",
										value: (
											<>
												<span className="type-mono-data">{record.mapVersion}</span> · immutable
												package
											</>
										)
									},
									{ label: "Point", value: "Placed by the observer on the map. Not device GPS." }
								]}
							/>
						</PreviewStateView>
					</Island>
				</div>

				<div className="flex min-w-0 flex-col gap-6">
					<Island
						flush
						title="All answers"
						meta={`${answers.length} ${answers.length === 1 ? "question" : "questions"} shown for this record`}>
						<PreviewStateView loadingLabel="Loading answers…" rows={8} headingLevel={3}>
							<dl className="divide-y divide-rule">
								{answers.map(answer => (
									<div key={answer.questionId} className="flex flex-col gap-1 px-island-pad py-4">
										<dt className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 type-small text-ink-2">
											<span>{answer.label}</span>
											<span>{answer.requirement}</span>
										</dt>
										<dd
											className={
												answer.value === null
													? "type-body text-ink-2"
													: "type-body font-semibold text-ink"
											}>
											{answer.value ?? "Not answered"}
										</dd>
									</div>
								))}
							</dl>
						</PreviewStateView>
					</Island>

					<Island flush title="History" divided={false}>
						<PreviewStateView loadingLabel="Loading history…" rows={3} headingLevel={3}>
							<div className="px-island-pad pt-1 pb-island-pad">
								<Timeline items={historyOf(record, review, decided)} />
							</div>
						</PreviewStateView>
					</Island>
				</div>
			</div>
		</div>
	);
}
