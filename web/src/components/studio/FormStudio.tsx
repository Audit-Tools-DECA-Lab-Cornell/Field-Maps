"use client";

import { useId, useMemo, useState } from "react";

import {
	AccentNote,
	AttentionNote,
	Chip,
	FadeRule,
	GhostAction,
	Input,
	PrimaryAction,
	Prose,
	SecondaryAction,
	SectionLabel
} from "@/components/nocturne/chrome";
import { type Condition, loadDefinition } from "@/lib/forms";

import { discardDraft, saveDraft, useDrafts } from "./draft-store";
import {
	type Act,
	ACT_ORDER,
	addQuestion,
	definitionFile,
	describeChanges,
	describeCondition,
	KIND_GLYPH,
	KIND_LABEL,
	nextVersion,
	type QuestionKind,
	type RawDefinition,
	type RawQuestion,
	type SourceDefinition
} from "./model";
import { PhonePreview } from "./PhonePreview";
import { QuestionEditor } from "./QuestionEditor";

type Entry = {
	readonly version: string;
	readonly raw: RawDefinition;
	readonly basedOn: string;
	readonly local: boolean;
	readonly file: string | null;
};

/**
 * The instrument as the collector will ask it: every question in authored order beside a phone
 * running the same engine. A published version is read-only — changing it starts a new draft
 * beside it — and a draft can be reworded, reordered and extended, with every problem named as it
 * appears. Drafts stay in this browser until the instrument API can hold one for the team.
 */
export function FormStudio({
	sources,
	initialVersion
}: {
	readonly sources: readonly SourceDefinition[];
	readonly initialVersion: string;
}) {
	const drafts = useDrafts();
	const [version, setVersion] = useState(initialVersion);
	const [editing, setEditing] = useState(false);
	const [selected, setSelected] = useState<string | null>(null);
	const [shown, setShown] = useState<string | null>(null);

	const entries = useMemo<readonly Entry[]>(() => {
		const shipped = new Set(sources.map(source => source.raw.version));
		return [
			...sources.map(source => {
				const draft = drafts[source.raw.version];
				return {
					version: source.raw.version,
					raw: draft?.raw ?? source.raw,
					basedOn: source.raw.version,
					local: draft !== undefined,
					file: source.file
				};
			}),
			...Object.entries(drafts)
				.filter(([key]) => !shipped.has(key))
				.map(([key, draft]) => ({
					version: key,
					raw: draft.raw,
					basedOn: draft.basedOn,
					local: true,
					file: null
				}))
		];
	}, [sources, drafts]);

	const entry = entries.find(candidate => candidate.version === version) ?? entries[0];
	const base = sources.find(source => source.raw.version === entry.basedOn) ?? sources[0];
	const result = useMemo(() => loadDefinition(entry.raw), [entry.raw]);
	const baseForm = useMemo(() => loadDefinition(base.raw).form, [base.raw]);
	const changes = useMemo(() => describeChanges(base.raw, entry.raw), [base.raw, entry.raw]);
	const previewForm = result.form ?? baseForm;
	const editable = entry.raw.status === "draft";
	const isEditing = editing && editable;
	const shippedIds = useMemo(() => new Set(base.raw.questions.map(question => question.id)), [base.raw]);

	const apply = (next: RawDefinition) => saveDraft(entry.version, { basedOn: entry.basedOn, raw: next });

	const startDraft = () => {
		const name = nextVersion(entry.version, new Set(entries.map(candidate => candidate.version)));
		saveDraft(name, { basedOn: entry.basedOn, raw: { ...entry.raw, version: name, status: "draft" } });
		setVersion(name);
		setEditing(true);
	};

	const discard = () => {
		discardDraft(entry.version);
		if (entry.file === null) setVersion(entry.basedOn);
		setEditing(false);
	};

	const download = () => {
		const url = URL.createObjectURL(new Blob([definitionFile(entry.raw)], { type: "application/json" }));
		const link = document.createElement("a");
		link.href = url;
		link.download = `${entry.version}.json`;
		link.click();
		URL.revokeObjectURL(url);
	};

	const problemsFor = (question: RawQuestion, index: number) =>
		result.problems.filter(
			problem => problem.includes(`"${question.id}"`) || problem.startsWith(`questions.${index}.`)
		);

	const questions = entry.raw.questions;
	const required = questions.filter(question => question.required).length;
	const ruled = questions.filter(question => question.dependsOn !== undefined).length;
	const flagged = questions.filter(question => question.protocolFlag !== undefined).length;
	const notes = entry.raw.protocolNotes ?? [];

	return (
		<section aria-labelledby="studio-title">
			{/* ── Version bar ─────────────────────────────────────────────────── */}
			<div className="flex flex-wrap items-center justify-between gap-base">
				<div role="tablist" aria-label="Form versions" className="flex flex-wrap gap-tight">
					{entries.map(candidate => (
						<button
							key={candidate.version}
							type="button"
							role="tab"
							aria-selected={candidate.version === entry.version}
							onClick={() => {
								setVersion(candidate.version);
								setSelected(null);
							}}
							className={`flex min-h-11 items-center gap-snug rounded-md border-l-2 px-loose text-left transition-colors duration-100 ${
								candidate.version === entry.version
									? "border-l-accent-400 bg-accent-900 text-accent-100"
									: "border-l-transparent bg-neutral-900/60 text-neutral-400 hover:bg-neutral-800"
							}`}>
							<span className="font-mono text-caption" translate="no">
								{candidate.version}
							</span>
							<VersionChip raw={candidate.raw} local={candidate.local} />
						</button>
					))}
				</div>

				<div className="flex flex-wrap items-center gap-snug">
					{result.problems.length === 0 ? (
						<Chip tone="accent" glyph="✓">
							Definition valid
						</Chip>
					) : (
						<Chip tone="attention" glyph="◼">
							{result.problems.length} problem{result.problems.length === 1 ? "" : "s"}
						</Chip>
					)}
					{editable ? (
						<PrimaryAction onClick={() => setEditing(!isEditing)}>
							{isEditing ? "Done customizing" : "Customize questions"}
						</PrimaryAction>
					) : (
						<PrimaryAction
							onClick={startDraft}
							title="A published version never changes; edits start a new draft">
							Start a new draft
						</PrimaryAction>
					)}
					<SecondaryAction onClick={download}>Download .json</SecondaryAction>
					{entry.local && <GhostAction onClick={discard}>Discard local changes</GhostAction>}
				</div>
			</div>

			<div className="mt-wide max-w-[72ch]">
				<h2 id="studio-title" className="text-title text-text">
					{entry.raw.title}
				</h2>
				<p className="mt-tight text-detail text-neutral-400">{entry.raw.summary}</p>
				<p className="tnum mt-snug text-micro text-neutral-500">
					{questions.length} questions · {required} required · {ruled} shown by a rule ·{" "}
					<span className={flagged + notes.length > 0 ? "text-attention-text" : undefined}>
						{flagged + notes.length} open protocol questions
					</span>{" "}
					· {entry.file === null ? "local draft, not in the repository" : entry.file}
				</p>
			</div>

			{isEditing && (
				<div className="mt-loose max-w-[72ch]">
					<AccentNote>
						<p className="text-detail text-neutral-300">
							Customizing <span className="font-mono text-accent-200">{entry.version}</span>. Wording,
							guidance, options and rules change here; the codes a record stores do not. Changes save in
							this browser as you type.
						</p>
					</AccentNote>
				</div>
			)}

			{/* ── Outline and phone ───────────────────────────────────────────── */}
			<div className="mt-wide grid grid-cols-1 gap-wide xl:grid-cols-[minmax(0,1fr)_auto]">
				<div className="min-w-0">
					<ol className="m-0 list-none p-0">
						{questions.map((question, index) => {
							const startsAct = index === 0 || questions[index - 1].act !== question.act;
							const isSelected = selected === question.id;
							const problems = problemsFor(question, index);
							return (
								<li key={question.id}>
									{startsAct && <ActHeading act={question.act} questions={questions} />}
									<QuestionRow
										raw={entry.raw}
										question={question}
										number={index + 1}
										selected={isSelected}
										onPhone={shown === question.id}
										problemCount={problems.length}
										onSelect={() => setSelected(isSelected ? null : question.id)}
									/>
									{isEditing && isSelected && (
										<QuestionEditor
											raw={entry.raw}
											question={question}
											isNew={!shippedIds.has(question.id)}
											problems={problems}
											onChange={apply}
											onRemoved={() => setSelected(null)}
										/>
									)}
								</li>
							);
						})}
					</ol>

					{isEditing && (
						<AddQuestion
							onAdd={(act, kind, label) => {
								const added = addQuestion(entry.raw, act, kind, label);
								apply(added.raw);
								setSelected(added.id);
							}}
						/>
					)}

					{result.problems.length > 0 && (
						<div className="mt-wide">
							<AttentionNote
								alert
								title="The phone shows the last valid version until these are fixed"
								body="A definition with a problem is never used — on this screen, on the device, or on the server.">
								<ul className="mt-snug list-none space-y-hair p-0">
									{result.problems.map(problem => (
										<li key={problem} className="text-caption text-neutral-300">
											{problem}
										</li>
									))}
								</ul>
							</AttentionNote>
						</div>
					)}

					{changes.length > 0 && (
						<section className="mt-wide" aria-labelledby="studio-changes">
							<SectionLabel>Against {base.file}</SectionLabel>
							<h3 id="studio-changes" className="mt-tight text-heading text-text">
								{changes.length} change{changes.length === 1 ? "" : "s"} in this draft
							</h3>
							<ul className="mt-snug list-none p-0">
								{changes.map(change => (
									<li
										key={change}
										className="border-b border-rule-faint py-snug text-detail text-neutral-300">
										{change}
									</li>
								))}
							</ul>
						</section>
					)}
				</div>

				<aside className="min-w-0 xl:sticky xl:top-base xl:self-start" aria-label="Collector preview">
					{previewForm ? (
						<PhonePreview form={previewForm} focusQuestionId={selected} onQuestionShown={setShown} />
					) : (
						<AttentionNote title="Nothing to preview" body="The shipped file itself does not parse." />
					)}
				</aside>
			</div>

			{/* ── Decisions waiting on the research team ─────────────────────── */}
			{notes.length > 0 && (
				<>
					<FadeRule className="my-wide" />
					<section aria-labelledby="studio-notes" className="max-w-[80ch]">
						<SectionLabel>Protocol</SectionLabel>
						<h3 id="studio-notes" className="mt-tight text-heading text-text">
							Decisions waiting on the research team
						</h3>
						<Prose tone="faint" className="mt-tight">
							Each one changes what a column means, so none is settled in code. The questions they touch
							carry a ◼ line above.
						</Prose>
						<ol className="mt-base list-none p-0">
							{notes.map((note, index) => (
								<li
									key={note.id}
									className="grid grid-cols-[2rem_minmax(0,1fr)] border-b border-rule-faint py-base">
									<span className="tnum text-micro text-attention-text">
										{String(index + 1).padStart(2, "0")}
									</span>
									<div className="min-w-0">
										<p className="text-body text-text">{note.title}</p>
										<p className="mt-hair text-detail text-neutral-400">{note.detail}</p>
										<p className="mt-hair text-micro text-neutral-600">{note.source}</p>
									</div>
								</li>
							))}
						</ol>
					</section>
				</>
			)}

			<FadeRule className="my-wide" />
			<div className="max-w-[72ch]">
				<AttentionNote
					title="Read from the repository, edited in this browser"
					body={
						<>
							{entry.file === null ? "This draft" : <span className="font-mono">{entry.file}</span>} is
							the canonical definition the collector bundles today. Drafts stay in this browser and
							publishing waits for the instrument API (BE-11); until then, download the file to share a
							draft for review.
						</>
					}
				/>
			</div>
		</section>
	);
}

/* ── Pieces ───────────────────────────────────────────────────────────────── */

function VersionChip({ raw, local }: { readonly raw: RawDefinition; readonly local: boolean }) {
	if (raw.status === "published")
		return (
			<Chip tone="accent" glyph="✓">
				Published
			</Chip>
		);
	return (
		<span className="flex items-center gap-hair">
			<Chip tone="attention" glyph="◷">
				Draft
			</Chip>
			{local && (
				<Chip tone="live" glyph="●">
					Edited here
				</Chip>
			)}
		</span>
	);
}

function ActHeading({ act, questions }: { readonly act: string; readonly questions: readonly RawQuestion[] }) {
	const count = questions.filter(question => question.act === act).length;
	return (
		<div className="flex items-baseline gap-snug pt-wide pb-tight">
			<h3 className="text-meta text-neutral-300">{act}</h3>
			<span className="tnum text-micro text-neutral-600">
				{count} question{count === 1 ? "" : "s"}
			</span>
			<span aria-hidden className="h-px flex-1 self-center bg-rule-faint" />
		</div>
	);
}

function QuestionRow({
	raw,
	question,
	number,
	selected,
	onPhone,
	problemCount,
	onSelect
}: {
	readonly raw: RawDefinition;
	readonly question: RawQuestion;
	readonly number: number;
	readonly selected: boolean;
	readonly onPhone: boolean;
	readonly problemCount: number;
	readonly onSelect: () => void;
}) {
	const options = question.options ?? [];
	const parent = question.dynamicFrom
		? raw.questions.find(candidate => candidate.id === question.dynamicFrom?.question)
		: undefined;
	const setCount = Object.keys(question.dynamicFrom?.sets ?? {}).length;

	return (
		<button
			type="button"
			onClick={onSelect}
			aria-expanded={selected}
			className={`grid w-full grid-cols-[2.25rem_minmax(0,1fr)] gap-x-snug border-b border-l-2 border-b-rule-faint py-base pr-loose pl-base text-left transition-colors duration-100 ${
				selected ? "border-l-accent bg-accent-900/40" : "border-l-transparent hover:bg-ink-tint"
			}`}>
			<span className="tnum pt-hair text-micro text-neutral-600">{String(number).padStart(2, "0")}</span>
			<span className="min-w-0">
				<span className="flex flex-wrap items-center gap-tight text-micro text-neutral-500">
					<span aria-hidden className="text-accent-400">
						{KIND_GLYPH[question.kind]}
					</span>
					{KIND_LABEL[question.kind]}
					{question.required && (
						<Chip tone="muted" glyph="✱">
							Required
						</Chip>
					)}
					{onPhone && (
						<Chip tone="live" glyph="●">
							On the phone
						</Chip>
					)}
					{problemCount > 0 && (
						<Chip tone="attention" glyph="◼">
							{problemCount} problem{problemCount === 1 ? "" : "s"}
						</Chip>
					)}
					<span className="ml-auto font-mono text-neutral-600" translate="no">
						{question.exportColumn === "" ? "no export column" : question.exportColumn}
					</span>
				</span>

				<span className="mt-hair block text-body text-text">{question.label || "Untitled question"}</span>
				{question.hint !== undefined && (
					<span className="mt-hair block text-caption text-neutral-500">{question.hint}</span>
				)}

				{question.dependsOn !== undefined && (
					<span className="mt-tight block border-l-2 border-accent-600 pl-snug text-caption text-neutral-300">
						↳ Shown when {describeCondition(raw, question.dependsOn as Condition)}
					</span>
				)}

				{options.length > 0 && (
					<span className="mt-snug flex flex-wrap gap-hair">
						{options.slice(0, 9).map(option => (
							<Chip key={option.code}>{option.label}</Chip>
						))}
						{options.length > 9 && <Chip>+{options.length - 9} more</Chip>}
					</span>
				)}
				{parent !== undefined && (
					<span className="mt-snug block text-caption text-neutral-400">
						Options follow “{parent.label}” — {setCount} lists, one for each answer
					</span>
				)}
				{question.optionsPending !== undefined && (
					<span className="mt-tight block text-caption text-attention-text">
						◼ Option list not supplied yet
					</span>
				)}
				{question.protocolFlag !== undefined && (
					<span className="mt-tight block text-caption text-attention-text">◼ {question.protocolFlag}</span>
				)}
			</span>
		</button>
	);
}

function AddQuestion({ onAdd }: { readonly onAdd: (act: Act, kind: QuestionKind, label: string) => void }) {
	const id = useId();
	const [label, setLabel] = useState("");
	const [act, setAct] = useState<Act>("Play");
	const [kind, setKind] = useState<QuestionKind>("one");
	const add = () => {
		if (label.trim() === "") return;
		onAdd(act, kind, label.trim());
		setLabel("");
	};

	return (
		<div className="mt-wide rounded-lg border border-dashed border-rule p-loose">
			<p className="text-meta text-neutral-300">Add a question</p>
			<p className="mt-hair text-micro text-neutral-600">
				A new question has no workbook row and no export column until the research team names one.
			</p>
			<div className="mt-base flex flex-wrap items-end gap-snug">
				<div className="min-w-[16rem] flex-1">
					<label htmlFor={`${id}-label`} className="mb-tight block text-micro text-neutral-500">
						Question
					</label>
					<Input
						id={`${id}-label`}
						value={label}
						placeholder="e.g. Is an adult supervising?"
						onChange={event => setLabel(event.target.value)}
						onKeyDown={event => {
							if (event.key === "Enter") {
								event.preventDefault();
								add();
							}
						}}
						className="min-h-11"
					/>
				</div>
				<div>
					<label htmlFor={`${id}-act`} className="mb-tight block text-micro text-neutral-500">
						Part of the form
					</label>
					<select
						id={`${id}-act`}
						value={act}
						onChange={event => setAct(event.target.value as Act)}
						className="min-h-11 rounded-md border border-rule bg-raised px-snug text-detail text-text hover:border-neutral-500 focus-visible:border-accent">
						{ACT_ORDER.map(candidate => (
							<option key={candidate} value={candidate}>
								{candidate}
							</option>
						))}
					</select>
				</div>
				<div>
					<label htmlFor={`${id}-kind`} className="mb-tight block text-micro text-neutral-500">
						Answer
					</label>
					<select
						id={`${id}-kind`}
						value={kind}
						onChange={event => setKind(event.target.value as QuestionKind)}
						className="min-h-11 rounded-md border border-rule bg-raised px-snug text-detail text-text hover:border-neutral-500 focus-visible:border-accent">
						{(["one", "many", "text", "number"] as const).map(candidate => (
							<option key={candidate} value={candidate}>
								{KIND_LABEL[candidate]}
							</option>
						))}
					</select>
				</div>
				<SecondaryAction onClick={add} disabled={label.trim() === ""}>
					Add question
				</SecondaryAction>
			</div>
		</div>
	);
}
