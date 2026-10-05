"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { Button, ButtonLink } from "@/components/contour/Button";
import { Checkbox } from "@/components/contour/Checkbox";
import { FactsList } from "@/components/contour/FactsList";
import { Icon } from "@/components/contour/Icon";
import { Island } from "@/components/contour/Island";
import { Mono } from "@/components/contour/Mono";
import { Note } from "@/components/contour/Note";
import { PageHeader } from "@/components/contour/PageHeader";
import { ScreenState } from "@/components/contour/ScreenState";
import { TextLink } from "@/components/contour/TextLink";
import { useToast } from "@/components/contour/Toast";
import { projectHref } from "@/features/shell/navigation";
import { PreviewStateView } from "@/features/shell/PreviewStateView";
import { PROTOCOL_NOTES } from "@/fixtures";

import { useFormWriteBlock } from "./CreateDraftDialog";
import { definitionOf, draftChanges, findVersion, plural, type QuestionChange, questionNumber } from "./model";
import { FlagGlyph } from "./parts";
import { NOTES_ID } from "./ProtocolNotes";
import { markPublished, useFormsPreview } from "./store";

/** How many protocol notes the blockers island names before "and 4 more". */
const NOTES_SHOWN = 4;

/**
 * Review publication (project-14): every difference from the published version, what changes in the
 * field, and the protocol notes that still block Janet's form. Publishing needs the confirmation ticked;
 * in this preview it marks the version published for this tab and nothing is sent.
 */
export function PublishScreen({ org, project, versionId }: { org: string; project: string; versionId: string }) {
	const router = useRouter();
	const toast = useToast();
	const confirmId = useId();
	const preview = useFormsPreview();
	const writeBlock = useFormWriteBlock();
	const [confirmed, setConfirmed] = useState(false);
	const [busy, setBusy] = useState(false);

	const version = findVersion(versionId, preview);
	const draft = definitionOf(versionId, preview);
	const base = version?.base ? definitionOf(version.base, preview) : undefined;
	const forms = projectHref(org, project, "forms");
	const versions = projectHref(org, project, "forms/versions");
	const editor = projectHref(org, project, `forms/versions/${versionId}`);

	if (!version || !draft)
		return (
			<div className="flex flex-col gap-6">
				<PageHeader
					breadcrumbs={[
						{ label: "Forms", href: forms },
						{ label: "Form versions", href: versions },
						{ label: "Publish" }
					]}
					title="Review publication"
				/>
				<Island flush>
					<ScreenState
						kind="empty"
						icon="file-text"
						headingLevel={2}
						title={`${versionId} is not in this preview`}
						body="A draft made in the preview lasts only as long as the tab it was made in. Every version this project has is on Form versions."
						actions={
							<ButtonLink href={versions} variant="ink" icon="arrow-left">
								Return to form versions
							</ButtonLink>
						}
					/>
				</Island>
			</div>
		);

	const changes = draftChanges(draft, base);
	const changedQuestions = new Set(changes.map(change => change.questionId)).size;
	const unchanged = draft.questions.length - changedQuestions;
	const unlabelled = draft.questions.findIndex(question => question.label.trim() === "");
	const published = version.state !== "draft";
	const blockingNotes = version.protocolNotesOpen;
	const janetBlocked = findVersion("janet-test-v1", preview);
	const notesFor = blockingNotes > 0 ? version.id : (janetBlocked?.id ?? "janet-test-v1");
	const baseObservations = version.base ? (findVersion(version.base, preview)?.observations ?? 0) : 0;

	const reason =
		writeBlock ??
		(published
			? `${versionId} is already ${version.state}. A published version cannot be edited or published again.`
			: blockingNotes > 0
				? `${plural(blockingNotes, "protocol note is", "protocol notes are")} open. ${versionId} cannot be published until each one is decided.`
				: draft.questions.length === 0
					? "This draft has no questions. Add at least one in the editor."
					: unlabelled >= 0
						? `Question ${questionNumber(unlabelled)} has no label. Word it in the editor first.`
						: !confirmed
							? "The button turns on when you tick the box above."
							: null);

	function publish() {
		if (reason) return;
		setBusy(true);
		markPublished(versionId);
		toast({
			title: `${versionId} is published. Devices use it once they download it.`,
			description: "In this preview only. Nothing was sent to the FieldMaps database."
		});
		router.push(versions);
	}

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				breadcrumbs={[
					{ label: "Forms", href: forms },
					{ label: "Form versions", href: versions },
					{ label: published ? versionId : "Draft", href: editor },
					{ label: "Publish" }
				]}
				title="Review publication"
				lead={
					version.base ? (
						<>
							Publishing creates <Mono>{versionId}</Mono>. It never changes <Mono>{version.base}</Mono>.
						</>
					) : (
						<>
							Publishing creates <Mono>{versionId}</Mono>. No earlier version exists to change.
						</>
					)
				}
				actions={
					<ButtonLink href={editor} variant="outline" icon="arrow-left">
						Return to editor
					</ButtonLink>
				}
			/>

			<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.27fr)_minmax(0,1fr)]">
				<Island
					title="Draft differences"
					meta={
						version.base
							? `${plural(changedQuestions, "question")} changed · ${unchanged} unchanged`
							: `First version · ${plural(draft.questions.length, "question")}`
					}
					flush>
					<PreviewStateView
						loadingLabel="Comparing the draft…"
						rows={3}
						headingLevel={3}
						empty={{
							icon: "file-text",
							title: "No differences to review",
							body: "This draft matches the published version. Nothing would change."
						}}
						filtered={{
							title: "No differences match this view",
							body: "Change your filters to see more differences. The draft is unchanged."
						}}>
						{!version.base ? (
							<p className="px-island-pad py-5 type-body text-ink-2">
								There is no earlier version to compare with. Every question is new in{" "}
								<Mono>{versionId}</Mono>.
							</p>
						) : changes.length === 0 ? (
							<p className="px-island-pad py-5 type-body text-ink-2">
								No question differs from <Mono>{version.base}</Mono> yet. Publishing now would create a
								version with the same wording.
							</p>
						) : (
							<ul className="divide-y divide-rule">
								{changes.map(change => (
									<li key={`${change.questionId}:${change.field}`} className="px-island-pad py-5">
										<Difference change={change} />
									</li>
								))}
							</ul>
						)}
						<div className="flex flex-col gap-5 border-t border-rule px-island-pad py-5">
							<Note tone="saved">
								{version.base ? (
									<>
										Existing observations retain {version.base}. Active collection sessions do not
										change mid-round.
									</>
								) : (
									"No observation uses this form yet. Active collection sessions do not change mid-round."
								)}
							</Note>
							<Checkbox
								id={confirmId}
								checked={confirmed}
								disabled={published || writeBlock !== null || blockingNotes > 0}
								onCheckedChange={setConfirmed}>
								I understand that a published version cannot be edited.
							</Checkbox>
							<Button
								icon="lock"
								fullWidth
								disabled={reason !== null}
								disabledReason={reason ?? undefined}
								busy={busy}
								busyLabel="Publishing…"
								onClick={publish}>
								Publish {versionId}
							</Button>
						</div>
					</PreviewStateView>
				</Island>

				<div className="flex flex-col gap-6">
					<Island title="What changes in the field" divided>
						<PreviewStateView loadingLabel="Loading field effects…" rows={4} headingLevel={3}>
							<FactsList
								labelWidth="minmax(8rem, 40%)"
								items={[
									{
										label: "New sessions",
										value: `Use ${versionId} once the device has downloaded it`
									},
									{
										label: "Sessions in progress",
										value: version.base
											? `Stay on ${version.base} until they end`
											: "Keep the version they started with"
									},
									{
										label:
											baseObservations > 0
												? `${plural(baseObservations, "existing observation")}`
												: "Existing observations",
										value: version.base
											? `Keep ${version.base} and its wording`
											: "None are collected with this form yet"
									},
									{
										label: "QGIS layer",
										value: (
											<>
												<Mono>form_version</Mono> tells the {version.base ? "two" : "versions"}{" "}
												apart
											</>
										)
									}
								]}
							/>
						</PreviewStateView>
					</Island>

					<Island
						title="Research-form blockers"
						meta={
							<span className="inline-flex items-baseline gap-1.5 font-semibold text-attention">
								<Icon name="triangle-alert" size={16} className="shrink-0 self-center" />
								Cannot be published yet
							</span>
						}
						divided={false}>
						<PreviewStateView loadingLabel="Loading protocol notes…" rows={4} headingLevel={3}>
							<p className="type-body text-ink">
								Publishing <Mono>{notesFor}</Mono> needs the protocol decisions below.{" "}
								{blockingNotes > 0
									? "None of them is filled in on the study’s behalf."
									: "Publishing the demonstration form does not resolve or bypass them."}
							</p>
							<ul className="mt-4 divide-y divide-rule border-y border-rule">
								{PROTOCOL_NOTES.slice(0, NOTES_SHOWN).map(note => (
									<li key={note.id} className="flex items-start gap-3 py-3">
										<FlagGlyph className="mt-0.5" />
										<span className="type-body text-ink">{note.title}</span>
									</li>
								))}
							</ul>
							<div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
								<p className="type-body text-ink-2">
									{PROTOCOL_NOTES.length > NOTES_SHOWN
										? `and ${PROTOCOL_NOTES.length - NOTES_SHOWN} more`
										: ""}
								</p>
								<TextLink href={`${versions}#${NOTES_ID}`} icon="book-open" arrow={false}>
									Read every protocol note
								</TextLink>
							</div>
						</PreviewStateView>
					</Island>
				</div>
			</div>
		</div>
	);
}

function Difference({ change }: { change: QuestionChange }) {
	return (
		<div>
			<div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
				<Mono className="text-ink">{change.questionId}</Mono>
				<span className="type-small text-ink-2">{change.field}</span>
			</div>
			<dl className="mt-3 grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 gap-y-2">
				<dt className="type-mono-label text-ink-2">Was</dt>
				<dd className="type-body text-ink-2">{change.was}</dd>
				<dt className="type-mono-label text-ink">Now</dt>
				<dd className="type-body font-semibold text-ink">{change.now}</dd>
			</dl>
			<p className="mt-3 type-small text-ink-2">{change.detail}</p>
		</div>
	);
}
