"use client";

import { useId } from "react";

import { Button } from "@/components/contour/Button";
import { Checkbox } from "@/components/contour/Checkbox";
import { Field } from "@/components/contour/Field";
import { Icon } from "@/components/contour/Icon";
import { IconButton } from "@/components/contour/IconButton";
import { Mono } from "@/components/contour/Mono";
import { Note } from "@/components/contour/Note";
import { Select } from "@/components/contour/Select";
import { TextInput } from "@/components/contour/TextInput";
import {
	type QuestionKind,
	type RawOption,
	type RawQuestion,
	slugify,
	STARTER_OPTIONS
} from "@/components/studio/model";

import { FORMAT_LABEL, questionChanges } from "./model";

export type QuestionPatch = Partial<
	Pick<RawQuestion, "label" | "hint" | "required" | "kind" | "options" | "columns" | "maxLength">
>;

/** The fewest options a choice question can carry and still be answerable. */
export const MIN_CHOICE_OPTIONS = 2;

/**
 * What changing an added question's answer format also changes. A choice format needs options to be
 * answerable, so it keeps the question's options or starts from Yes and No; a written answer gets its
 * length limit; a number carries neither. Keys set to `undefined` are removed from the draft.
 */
export function formatPatch(question: RawQuestion, kind: QuestionKind): QuestionPatch {
	if (kind === "one" || kind === "many") {
		const options = question.options && question.options.length > 0 ? question.options : [...STARTER_OPTIONS];
		return { kind, options, columns: question.columns ?? 2, maxLength: undefined };
	}
	if (kind === "text") return { kind, options: undefined, columns: undefined, maxLength: question.maxLength ?? 200 };
	return { kind, options: undefined, columns: undefined, maxLength: undefined };
}

/** An option code from its label, unique among the others. Codes of an unpublished question may follow its label. */
function optionCode(label: string, others: readonly RawOption[]): string {
	const taken = new Set(others.map(option => option.code));
	const base = slugify(label);
	if (!taken.has(base)) return base;
	for (let n = 2; ; n++) if (!taken.has(`${base}_${n}`)) return `${base}_${n}`;
}

/** Why an added choice question cannot be saved yet, or null. */
export function optionsProblem(question: RawQuestion): string | null {
	if (question.kind !== "one" && question.kind !== "many") return null;
	if (question.dynamicFrom) return null;
	const options = question.options ?? [];
	if (options.length < MIN_CHOICE_OPTIONS)
		return `Add at least ${MIN_CHOICE_OPTIONS} options so observers can answer it.`;
	if (options.some(option => option.label.trim() === "")) return "Every option needs a label.";
	return null;
}

/** A question added in this preview has no workbook row: its answer format is still open. */
export const ADDED_SOURCE = "Added in the FieldMaps preview — no workbook row";

/**
 * Question settings (project-13): the label and guidance a draft may reword, the stable identifier it
 * never changes, the answer format and options as the source list fixes them, and whether an answer is
 * required. Every keystroke reaches the live preview; "Save question to draft" keeps it in the draft.
 */
export function QuestionSettings({
	question,
	base,
	baseVersion,
	readOnly,
	writeBlock,
	onChange,
	onSave
}: {
	question: RawQuestion;
	/** The same question in the published version, when there is one. */
	base: RawQuestion | undefined;
	baseVersion: string | null;
	/** A published or retired version: nothing here can change. */
	readOnly: boolean;
	/** Why the reader cannot save now (offline, a Viewer), or null. */
	writeBlock: string | null;
	onChange: (patch: QuestionPatch) => void;
	onSave: () => void;
}) {
	const id = useId();
	const added = question.source === ADDED_SOURCE;
	const locked = readOnly || writeBlock !== null;
	const wording = questionChanges(question, base).filter(
		change => change.field === "Question label" || change.field === "Guidance" || change.field === "Required"
	);
	const labelMissing = question.label.trim() === "";
	const optionsBlock = added ? optionsProblem(question) : null;

	return (
		<div className="flex flex-col gap-6">
			<Field
				label="Question label"
				htmlFor={`${id}-label`}
				error={labelMissing && !locked ? "Enter the question as observers read it." : undefined}>
				<TextInput
					value={question.label}
					readOnly={locked}
					onChange={event => onChange({ label: event.target.value })}
				/>
			</Field>

			<Field
				label="Field identifier"
				htmlFor={`${id}-identifier`}
				hint="Stable ID retained across wording edits.">
				<TextInput value={question.id} readOnly className="font-mono" />
			</Field>

			<Field label="Guidance" htmlFor={`${id}-guidance`} optional={!locked}>
				<TextInput
					value={question.hint ?? ""}
					readOnly={locked}
					placeholder={locked ? undefined : "What the observer should know before answering"}
					onChange={event => onChange({ hint: event.target.value })}
				/>
			</Field>

			{baseVersion && wording.length > 0 && (
				<Note tone="waiting" icon="pencil" live="polite">
					<p className="font-semibold text-waiting">Changed from {baseVersion}</p>
					{wording.map(change => (
						<p key={change.field} className="mt-1">
							{wording.length > 1 ? `${change.field} was: ` : "Was: "}“{change.was}”
						</p>
					))}
				</Note>
			)}
			{!base && baseVersion && (
				<Note tone="waiting" icon="pencil">
					<p className="font-semibold text-waiting">New in this draft</p>
					<p className="mt-1">
						{baseVersion} does not have this question, so no existing observation answers it.
					</p>
				</Note>
			)}

			{added && !locked ? (
				<Field
					label="Answer format"
					htmlFor={`${id}-format`}
					hint="Open while the question is new. It cannot change once a version with it is published.">
					<Select
						value={question.kind}
						onChange={event => onChange(formatPatch(question, event.target.value as QuestionKind))}>
						{(Object.keys(FORMAT_LABEL) as QuestionKind[]).map(kind => (
							<option key={kind} value={kind}>
								{FORMAT_LABEL[kind]}
							</option>
						))}
					</Select>
				</Field>
			) : (
				<Field
					label="Answer format"
					htmlFor={`${id}-format`}
					hint={
						added
							? undefined
							: "Read-only. The source fixes it, so every answer keeps its meaning across versions."
					}>
					<TextInput value={FORMAT_LABEL[question.kind]} readOnly />
				</Field>
			)}

			{added && !locked && (question.kind === "one" || question.kind === "many") ? (
				<OptionsEditor question={question} onChange={onChange} />
			) : (
				<Options question={question} added={added} />
			)}

			<Checkbox
				id={`${id}-required`}
				checked={question.required ?? false}
				disabled={locked}
				onCheckedChange={checked => onChange({ required: checked })}>
				Required when visible
			</Checkbox>

			{!readOnly && (
				<div className="flex flex-col gap-3 border-t border-rule pt-6">
					<Button
						variant="ink"
						icon="check"
						fullWidth
						disabled={writeBlock !== null || labelMissing || optionsBlock !== null}
						disabledReason={
							writeBlock ?? (labelMissing ? "Enter a question label first." : (optionsBlock ?? undefined))
						}
						onClick={onSave}>
						Save question to draft
					</Button>
					<p className="type-small text-ink-2">
						{baseVersion ? (
							<>
								Saving changes this draft only. Published <Mono>{baseVersion}</Mono> and the source file
								stay as they are.
							</>
						) : (
							"Saving changes this draft only. The source file stays as it is."
						)}
					</p>
				</div>
			)}
		</div>
	);
}

function Options({ question, added }: { question: RawQuestion; added: boolean }) {
	if (question.kind === "text")
		return (
			<div>
				<p className="type-small font-semibold text-ink">Answer</p>
				<p className="mt-2 type-body text-ink-2">
					Written answer
					{question.maxLength !== undefined ? ` · up to ${question.maxLength} characters` : ""}
				</p>
			</div>
		);
	if (question.kind === "number")
		return (
			<div>
				<p className="type-small font-semibold text-ink">Answer</p>
				<p className="mt-2 type-body text-ink-2">A whole number</p>
			</div>
		);

	const options = question.options ?? [];
	const dynamic = question.dynamicFrom;

	return (
		<div>
			<div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
				<p className="type-small font-semibold text-ink">Options</p>
				<p className="inline-flex items-baseline gap-1.5 type-small text-ink-2">
					<Icon name="lock" size={16} className="shrink-0 self-center" />
					{added ? "Starter options" : "Locked to the source list"}
				</p>
			</div>
			{question.optionsPending ? (
				<Note tone="waiting" icon="flag" className="mt-3">
					{question.optionsPending}
				</Note>
			) : dynamic ? (
				<p className="mt-2 type-body text-ink-2">
					The options follow the answer to the earlier question: {Object.keys(dynamic.sets).length} option
					sets, one per answer.
				</p>
			) : (
				<ul className="mt-3 flex flex-wrap gap-2" aria-label="Options">
					{options.map(option => (
						<li
							key={option.code}
							className="inline-flex min-h-9 items-center rounded-pill border border-edge px-3 type-small text-ink">
							{option.label}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

/**
 * The options of a question added in this draft: each label can be edited, removed or added to. Codes
 * follow the labels while the question is unpublished, and a choice question always keeps at least two.
 */
function OptionsEditor({ question, onChange }: { question: RawQuestion; onChange: (patch: QuestionPatch) => void }) {
	const id = useId();
	const options = question.options ?? [];

	function relabel(index: number, label: string) {
		const others = options.filter((_, at) => at !== index);
		const next = options.map((option, at) => (at === index ? { code: optionCode(label, others), label } : option));
		onChange({ options: next });
	}

	function remove(index: number) {
		onChange({ options: options.filter((_, at) => at !== index) });
	}

	function add() {
		const label = `Option ${options.length + 1}`;
		onChange({ options: [...options, { code: optionCode(label, options), label }] });
	}

	const problem = optionsProblem(question);
	return (
		<fieldset className="flex flex-col gap-3" aria-describedby={problem ? `${id}-problem` : undefined}>
			<legend className="type-small font-semibold text-ink">Options</legend>
			<ol className="flex flex-col gap-2">
				{options.map((option, index) => (
					<li key={index} className="flex items-center gap-2">
						<span aria-hidden="true" className="w-6 shrink-0 text-right type-mono-data text-ink-2">
							{index + 1}
						</span>
						<TextInput
							aria-label={`Option ${index + 1} label`}
							value={option.label}
							onChange={event => relabel(index, event.target.value)}
							className="min-w-0 grow"
						/>
						<IconButton
							icon="x"
							label={
								options.length <= MIN_CHOICE_OPTIONS
									? `Remove option ${index + 1}, a choice needs at least ${MIN_CHOICE_OPTIONS}`
									: `Remove option ${index + 1}`
							}
							disabled={options.length <= MIN_CHOICE_OPTIONS}
							onClick={() => remove(index)}
						/>
					</li>
				))}
			</ol>
			<div>
				<Button variant="outline" icon="plus" onClick={add}>
					Add an option
				</Button>
			</div>
			<p
				id={`${id}-problem`}
				className={problem ? "type-small font-semibold text-attention" : "type-small text-ink-2"}>
				{problem ?? "Codes follow the labels until a version with this question is published."}
			</p>
		</fieldset>
	);
}
