"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button, ButtonLink } from "@/components/contour/Button";
import { Dialog, DialogClose } from "@/components/contour/Dialog";
import { Island } from "@/components/contour/Island";
import { Mono } from "@/components/contour/Mono";
import { Note } from "@/components/contour/Note";
import { PageHeader } from "@/components/contour/PageHeader";
import { ScreenState } from "@/components/contour/ScreenState";
import { Segmented } from "@/components/contour/Segmented";
import { TextLink } from "@/components/contour/TextLink";
import { useToast } from "@/components/contour/Toast";
import { addQuestion, type RawDefinition, updateQuestion } from "@/components/studio/model";
import { projectHref } from "@/features/shell/navigation";
import { PreviewStateView } from "@/features/shell/PreviewStateView";
import { useLeaveGuard } from "@/features/shell/useLeaveGuard";
import type { ProjectedSite } from "@/lib/plan";

import { CollectorPreview, type PreviewDevice } from "./CollectorPreview";
import { useCreateDraft, useFormWriteBlock } from "./CreateDraftDialog";
import { changedIds, definitionOf, findVersion, questionNumber, toForm } from "./model";
import { QuestionList } from "./QuestionList";
import { ADDED_SOURCE, type QuestionPatch, QuestionSettings } from "./QuestionSettings";
import { saveDraftDefinition, useFormsPreview } from "./store";

export type EditorSession = {
	plan: ProjectedSite;
	zoneId: string;
	siteName: string;
	sessionLine: string;
	mapVersion: string;
};

/** Applies unsaved edits over the saved draft. An emptied guidance removes the key, as authored JSON has it. */
function applyEdits(raw: RawDefinition, edits: Record<string, QuestionPatch>): RawDefinition {
	let next = raw;
	for (const [id, patch] of Object.entries(edits)) {
		const clean: QuestionPatch = { ...patch };
		if ("hint" in clean && !clean.hint) clean.hint = undefined;
		next = updateQuestion(next, id, clean);
	}
	return next;
}

/**
 * The draft form editor (project-13): the draft's questions, the selected question's settings, and the
 * collector preview running the edited draft through the real engine as it is typed. A published or
 * retired version opens read-only.
 */
export function DraftEditorScreen({
	org,
	project,
	versionId,
	session
}: {
	org: string;
	project: string;
	versionId: string;
	session: EditorSession;
}) {
	const preview = useFormsPreview();
	const writeBlock = useFormWriteBlock();
	const create = useCreateDraft(org, project);
	const toast = useToast();
	const version = findVersion(versionId, preview);
	const saved = definitionOf(versionId, preview);
	const baseRaw = version?.base ? definitionOf(version.base, preview) : undefined;

	const [edits, setEdits] = useState<Record<string, QuestionPatch>>({});
	const [chosen, setChosen] = useState<string | null>(null);
	const [device, setDevice] = useState<PreviewDevice>("phone");

	const working = useMemo(() => (saved ? applyEdits(saved, edits) : undefined), [saved, edits]);
	const form = useMemo(() => (working ? toForm(working) : undefined), [working]);
	const dirty = Object.keys(edits).length > 0;
	const router = useRouter();

	// Leaving with unsaved edits asks first: closing the tab gets the browser's question, and a link inside the
	// workspace ("Review publication", a breadcrumb, a tab) is held until the manager saves, discards or stays.
	// Without this, the publication page would read the older saved wording.
	const guard = useLeaveGuard(dirty);
	const unsavedLabels = Object.keys(edits).filter(id => (working?.questions ?? []).some(q => q.id === id));
	const blankLabel = unsavedLabels.some(id => working?.questions.find(q => q.id === id)?.label.trim() === "");

	const forms = projectHref(org, project, "forms");
	const versions = projectHref(org, project, "forms/versions");

	if (!version || !saved || !working || !form)
		return (
			<div className="flex flex-col gap-6">
				<PageHeader
					breadcrumbs={[
						{ label: "Forms", href: forms },
						{ label: "Form versions", href: versions },
						{ label: versionId }
					]}
					title="Form version not found"
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

	const readOnly = version.state !== "draft";
	const questions = working.questions;
	const selectedId = questions.some(question => question.id === chosen) ? chosen : (questions[0]?.id ?? null);
	const selectedIndex = questions.findIndex(question => question.id === selectedId);
	const selected = questions[selectedIndex];
	const changed = changedIds(saved, baseRaw);
	const unsaved = new Set(Object.keys(edits));
	const created = preview.created.find(entry => entry.id === versionId);
	const canAdd = !readOnly && writeBlock === null && created?.origin === "empty";

	function change(patch: QuestionPatch) {
		if (!selectedId) return;
		setEdits(current => ({ ...current, [selectedId]: { ...current[selectedId], ...patch } }));
	}

	function save() {
		if (!saved || !selected || !working) return;
		const number = questionNumber(selectedIndex);
		if (!edits[selected.id]) {
			toast({
				title: `Question ${number} has no unsaved edits`,
				description: "The draft already has this wording."
			});
			return;
		}
		const before = saved;
		const after = applyEdits(saved, { [selected.id]: edits[selected.id] });
		saveDraftDefinition(versionId, after);
		setEdits(current => {
			const next = { ...current };
			delete next[selected.id];
			return next;
		});
		toast({
			title: `Question ${number} saved to the ${versionId} draft`,
			description: version?.base
				? `In this preview only. Published ${version.base} is unchanged.`
				: "In this preview only. The source file is unchanged.",
			action: { label: "Undo", onClick: () => saveDraftDefinition(versionId, before) }
		});
	}

	/** Saves every question with unsaved edits in one step, so leaving keeps them. */
	function saveAllAndLeave() {
		const to = guard.leavingTo;
		if (!saved || !to) return;
		saveDraftDefinition(versionId, applyEdits(saved, edits));
		setEdits({});
		guard.stay();
		toast({
			title: `${unsavedLabels.length === 1 ? "1 question" : `${unsavedLabels.length} questions`} saved to the ${versionId} draft`,
			description: "In this preview only."
		});
		router.push(to);
	}

	function leaveWithoutSaving() {
		const to = guard.leavingTo;
		setEdits({});
		guard.stay();
		if (to) router.push(to);
	}

	function add() {
		if (!saved) return;
		const { raw, id } = addQuestion(saved, "Record", "text", "New question");
		const withSource = updateQuestion(raw, id, { source: ADDED_SOURCE });
		saveDraftDefinition(versionId, withSource);
		setChosen(id);
		toast({ title: "A new question is in the draft", description: "Word it, then save it to the draft." });
	}

	const stateWord = version.state === "draft" ? "draft" : version.state;
	const lead = readOnly ? (
		<>
			<Mono>{versionId}</Mono> {stateWord} · its wording and rules are fixed.
		</>
	) : (
		<>
			<Mono>{versionId}</Mono> draft · question wording is editable · conditional rules are preserved.
		</>
	);

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				breadcrumbs={[
					{ label: "Forms", href: forms },
					{ label: "Form versions", href: versions },
					{ label: readOnly ? versionId : "Draft" }
				]}
				title={readOnly ? `Form ${versionId}` : "Draft form editor"}
				lead={lead}
				actions={
					readOnly ? undefined : (
						<ButtonLink
							href={projectHref(org, project, `forms/versions/${versionId}/publish`)}
							iconRight="arrow-right">
							Review publication
						</ButtonLink>
					)
				}
			/>

			{readOnly && (
				<Note tone="neutral" icon="lock">
					<span className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
						<span>
							{version.state === "retired"
								? "Retired versions cannot change. Start a new draft to edit."
								: "Published versions cannot change. Start a new draft to edit."}
						</span>
						<Button
							variant="outline"
							icon="pencil"
							disabled={writeBlock !== null}
							disabledReason={writeBlock ?? undefined}
							onClick={() => create("copy", versionId)}>
							Start a new draft
						</Button>
					</span>
				</Note>
			)}
			{!readOnly && writeBlock && (
				<Note tone="waiting" icon="lock">
					{writeBlock}
				</Note>
			)}

			<div
				className={
					device === "tablet"
						? "grid items-start gap-6 lg:grid-cols-2"
						: "grid items-start gap-6 lg:grid-cols-2 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)_minmax(0,0.95fr)]"
				}>
				<Island
					title="Questions"
					meta={
						questions.length === 0
							? "None yet"
							: version.base
								? `${questions.length} · ${changed.size} changed`
								: `${questions.length} questions`
					}
					flush>
					<PreviewStateView
						loadingLabel="Loading questions…"
						rows={6}
						headingLevel={3}
						empty={{
							icon: "file-text",
							title: "No questions yet",
							body: "This version has no questions to show."
						}}
						filtered={{
							title: "No questions match this view",
							body: "Change your filters to see more questions. The draft is unchanged."
						}}>
						{questions.length === 0 ? (
							<ScreenState
								kind="empty"
								icon="file-text"
								headingLevel={3}
								title="No questions yet"
								body="Add the first question. It appears in the preview as an observer sees it."
							/>
						) : (
							<QuestionList
								questions={questions}
								selectedId={selectedId}
								changed={changed}
								unsaved={unsaved}
								onSelect={setChosen}
							/>
						)}
						{canAdd && (
							<div className="border-t border-rule px-5 py-4">
								<Button variant="outline" icon="plus" onClick={add}>
									Add a question
								</Button>
							</div>
						)}
					</PreviewStateView>
				</Island>

				<Island
					title="Question settings"
					meta={
						selected ? (
							<Mono className="text-ink-2">{`${questionNumber(selectedIndex)} · ${selected.code}`}</Mono>
						) : undefined
					}
					divided={false}>
					<PreviewStateView loadingLabel="Loading question settings…" rows={5} headingLevel={3}>
						{selected ? (
							<QuestionSettings
								key={selected.id}
								question={selected}
								base={baseRaw?.questions.find(question => question.id === selected.id)}
								baseVersion={version.base}
								readOnly={readOnly}
								writeBlock={writeBlock}
								onChange={change}
								onSave={save}
							/>
						) : (
							<p className="type-body text-ink-2">Choose a question to see its settings.</p>
						)}
					</PreviewStateView>
				</Island>

				<section
					aria-label="Live preview"
					className={
						device === "tablet"
							? "flex flex-col gap-4 lg:col-span-2"
							: "flex flex-col gap-4 lg:col-span-2 xl:col-span-1"
					}>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<h2 className="min-w-32 grow basis-0 type-mono-label text-ink-2">
							Live {device} preview · {readOnly ? stateWord : "draft"}
						</h2>
						<div className="shrink-0">
							<Segmented
								label="Preview device"
								value={device}
								onValueChange={value => setDevice(value as PreviewDevice)}
								options={[
									{ value: "phone", label: "Phone" },
									{ value: "tablet", label: "Tablet" }
								]}
							/>
						</div>
					</div>
					<CollectorPreview
						form={form}
						versionLabel={`${versionId} ${stateWord}`}
						device={device}
						focusQuestionId={selectedId}
						{...session}
					/>
					<TextLink href={projectHref(org, project, "data")} className="self-center">
						See collected version provenance
					</TextLink>
				</section>
			</div>

			<Dialog
				open={guard.leavingTo !== null}
				onOpenChange={open => {
					if (!open) guard.stay();
				}}
				title="Save your question edits first?"
				description={
					unsavedLabels.length === 1
						? "One question has edits that are not in the draft yet. If you leave without saving, they are lost and the draft keeps its earlier wording."
						: `${unsavedLabels.length} questions have edits that are not in the draft yet. If you leave without saving, they are lost and the draft keeps its earlier wording.`
				}
				footer={
					<>
						<DialogClose asChild>
							<Button variant="outline">Keep editing</Button>
						</DialogClose>
						<Button variant="outline" icon="arrow-right" onClick={leaveWithoutSaving}>
							Leave without saving
						</Button>
						<Button
							variant="ink"
							icon="check"
							disabled={blankLabel}
							disabledReason={
								blankLabel ? "A question has no label. Enter one, or leave without saving." : undefined
							}
							onClick={saveAllAndLeave}>
							Save edits and leave
						</Button>
					</>
				}
			/>
		</div>
	);
}
