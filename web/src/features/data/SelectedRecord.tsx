"use client";

import { useId } from "react";

import { Button } from "@/components/contour/Button";
import { FactsList } from "@/components/contour/FactsList";
import { StateBadge } from "@/components/contour/StateBadge";
import { TextLink } from "@/components/contour/TextLink";
import { formatDayTime, formatTime, type Observation, personByInitials, type ReviewState } from "@/fixtures";
import { cx } from "@/lib/cx";

import { zoneName } from "./filters";

export type ReviewAccess = {
	/** Approve and Exclude work. */
	allowed: boolean;
	/** Why they do not, shown under them. */
	reason?: string;
};

export type SelectedRecordProps = {
	record: Observation;
	review: ReviewState;
	siteName: string;
	access: ReviewAccess;
	onDecide: (next: "approved" | "excluded") => void;
	detailHref: string;
	/** In the dialog below 1280 px the title is the dialog's own, so the panel leaves it out. */
	inDialog?: boolean;
};

/** The badge colour changes over `quick` when a decision swaps it. */
const BADGE_MOTION = "transition-[color] duration-(--ct-duration-quick) ease-standard";

/** The record's summary answer: the free-text description, or the last answered question. */
function recordedAnswer(record: Observation) {
	const answers = record.answers ?? [];
	return (
		answers.find(answer => answer.questionId === "play_event_summary" && answer.value) ??
		[...answers].reverse().find(answer => answer.value)
	);
}

/** The reason line under Approve and Exclude, when either is off. */
export function decisionReason(review: ReviewState, access: ReviewAccess): string | undefined {
	if (!access.allowed) return access.reason;
	if (review === "approved") return "Already approved. Exclude it to change the decision.";
	if (review === "excluded") return "Already excluded. Approve it to change the decision.";
	return undefined;
}

/** Approve (ink) and Exclude (outline), with the decision already made shown as a disabled button and its reason. */
export function DecisionButtons({
	review,
	access,
	onDecide,
	trailing,
	className
}: {
	review: ReviewState;
	access: ReviewAccess;
	onDecide: (next: "approved" | "excluded") => void;
	trailing?: React.ReactNode;
	className?: string;
}) {
	const reasonId = useId();
	const reason = decisionReason(review, access);
	const approveOff = !access.allowed || review === "approved";
	const excludeOff = !access.allowed || review === "excluded";
	return (
		<div className={cx("flex flex-col gap-2", className)}>
			<div className="flex flex-wrap items-center gap-3">
				<Button
					variant="ink"
					icon="check"
					disabled={approveOff}
					aria-describedby={approveOff && reason ? reasonId : undefined}
					aria-keyshortcuts="a"
					onClick={() => onDecide("approved")}>
					{review === "approved" ? "Approved" : "Approve"}
				</Button>
				<Button
					variant="outline"
					icon="x"
					disabled={excludeOff}
					aria-describedby={excludeOff && reason ? reasonId : undefined}
					aria-keyshortcuts="x"
					onClick={() => onDecide("excluded")}>
					{review === "excluded" ? "Excluded" : "Exclude"}
				</Button>
				{trailing != null && <div className="ml-auto">{trailing}</div>}
			</div>
			{reason && (
				<p id={reasonId} className="type-small text-ink-2">
					{reason}
				</p>
			)}
		</div>
	);
}

/**
 * The selected observation beside the map (project-02): its upload state, play type, capture facts, the
 * recorded answer, and the review decision. Approve and Exclude change the session's preview only.
 */
export function SelectedRecord({
	record,
	review,
	siteName,
	access,
	onDecide,
	detailHref,
	inDialog = false
}: SelectedRecordProps) {
	const observer = personByInitials(record.observerInitials);
	const answer = recordedAnswer(record);

	return (
		<div className="flex flex-col">
			<div className={cx("flex flex-col gap-1", !inDialog && "px-5 pt-5")}>
				<div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
					<p className="type-mono-label text-ink-2">Selected · {record.id}</p>
					{record.uploadedAt && (
						<StateBadge
							kind="queue"
							state="uploaded"
							label={`Uploaded ${formatTime(record.uploadedAt)}`}
							size="sm"
						/>
					)}
				</div>
				{!inDialog && <h2 className="type-section text-ink">{record.playTypeLabel} play</h2>}
			</div>

			<FactsList
				className={cx("mt-4 border-t border-rule pt-3", !inDialog && "mx-5")}
				labelWidth="minmax(6rem, 30%)"
				items={[
					{ label: "Site · zone", value: `${siteName} · ${zoneName(record.zoneSlug)}` },
					{ label: "Round", value: String(record.round) },
					{
						label: "Observer",
						value: observer ? `${record.observerInitials} · ${observer.name}` : record.observerInitials
					},
					{ label: "Captured", value: formatDayTime(record.capturedAt) },
					{ label: "Versions", value: `FORM ${record.formVersion} · MAP ${record.mapVersion}`, mono: true },
					{
						label: "Review",
						value: <StateBadge kind="review" state={review} className={BADGE_MOTION} />
					}
				]}
			/>

			<div className={cx("mt-4 flex flex-col gap-4 border-t border-rule py-5", !inDialog && "px-5")}>
				{answer && (
					<div className="flex flex-col gap-1">
						<p className="type-mono-label text-ink-2">Recorded answer</p>
						<p className="font-semibold text-ink">{answer.label}</p>
						<p className="type-body text-ink">{answer.value}</p>
					</div>
				)}
				<DecisionButtons
					review={review}
					access={access}
					onDecide={onDecide}
					trailing={<TextLink href={detailHref}>Open all answers</TextLink>}
				/>
				<p className="type-small text-ink-2">
					<StateBadge kind="proposal" state="open" label="Proposal U5" size="sm" className="mr-2" />
					Review decides what analysts see when the Approved-only scope is on. Upload state and review are
					separate.
				</p>
			</div>
		</div>
	);
}
