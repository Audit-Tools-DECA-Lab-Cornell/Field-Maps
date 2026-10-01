"use client";

import { type ComponentPropsWithoutRef, type ReactNode, useId, useState } from "react";

import { GhostAction, Input, LinkAction, SecondaryAction } from "@/components/nocturne/chrome";
import type { Condition } from "@/lib/forms";

import {
	addOption,
	describeCondition,
	KIND_GLYPH,
	KIND_LABEL,
	moveOption,
	moveQuestion,
	optionsOf,
	type OptionTarget,
	type QuestionKind,
	type RawDefinition,
	type RawQuestion,
	relabelOption,
	removeOption,
	removeQuestion,
	STARTER_OPTIONS,
	updateQuestion
} from "./model";

/**
 * Edits one question in place. Wording, guidance and layout may change freely in a draft; what a
 * record stores — the question id and each option's code — never follows a relabel, so a record
 * collected under an earlier wording still means what it meant.
 */
export function QuestionEditor({
	raw,
	question,
	isNew,
	problems,
	onChange,
	onRemoved
}: {
	readonly raw: RawDefinition;
	readonly question: RawQuestion;
	/** Added in this draft, so its kind can still change: no record can hold it yet. */
	readonly isNew: boolean;
	readonly problems: readonly string[];
	readonly onChange: (next: RawDefinition) => void;
	readonly onRemoved: () => void;
}) {
	const id = useId();
	const [confirmDelete, setConfirmDelete] = useState(false);
	const patch = (change: Partial<RawQuestion>) => onChange(updateQuestion(raw, question.id, change));
	const isChoice = question.kind === "one" || question.kind === "many";
	const index = raw.questions.findIndex(candidate => candidate.id === question.id);
	const dependents = raw.questions.filter(candidate =>
		JSON.stringify([candidate.dependsOn, candidate.dynamicFrom?.question]).includes(`"${question.id}"`)
	);

	return (
		<div
			className="mt-snug rounded-lg border border-edge bg-surface p-loose"
			aria-label={`Edit “${question.label}”`}>
			{problems.length > 0 && (
				<ul className="mb-loose list-none space-y-tight border-l-2 border-attention p-0 pl-base" role="alert">
					{problems.map(problem => (
						<li key={problem} className="text-caption text-attention-text">
							◼ {problem}
						</li>
					))}
				</ul>
			)}

			<div className="grid gap-loose">
				<Field label="Question, as the observer reads it" htmlFor={`${id}-label`}>
					<Input
						id={`${id}-label`}
						value={question.label}
						onChange={event => patch({ label: event.target.value })}
						className="min-h-11 text-body"
					/>
				</Field>

				<Field
					label="Guidance under the question"
					htmlFor={`${id}-hint`}
					detail="Optional. One sentence that settles the usual doubt in the field.">
					<TextArea
						id={`${id}-hint`}
						rows={2}
						value={question.hint ?? ""}
						onChange={event => patch({ hint: event.target.value === "" ? undefined : event.target.value })}
					/>
				</Field>

				<div className="flex flex-wrap items-start gap-wide">
					<Field label="Answer">
						{isNew ? (
							<Segmented
								label="Answer kind"
								value={question.kind}
								options={(["one", "many", "text", "number"] as const).map(kind => ({
									value: kind,
									label: `${KIND_GLYPH[kind]} ${KIND_LABEL[kind]}`
								}))}
								onChange={kind => patch(kindChange(question, kind))}
							/>
						) : (
							<p className="flex min-h-11 items-center gap-tight text-detail text-neutral-300">
								<span aria-hidden className="text-accent-400">
									{KIND_GLYPH[question.kind]}
								</span>
								{KIND_LABEL[question.kind]}
								<span className="text-micro text-neutral-600">· fixed once records can exist</span>
							</p>
						)}
					</Field>

					<Field label="Before saving">
						<Segmented
							label="Required"
							value={question.required ? "required" : "optional"}
							options={[
								{ value: "optional", label: "Optional" },
								{ value: "required", label: "Required" }
							]}
							onChange={value => patch({ required: value === "required" ? true : undefined })}
						/>
					</Field>

					{isChoice && (
						<Field label="Option columns on a tablet">
							<Segmented
								label="Option columns"
								value={String(question.columns ?? 1)}
								options={["1", "2", "3", "4"].map(value => ({ value, label: value }))}
								onChange={value => patch({ columns: value === "1" ? undefined : Number(value) })}
							/>
						</Field>
					)}

					{question.kind === "text" && (
						<Field label="Longest answer" htmlFor={`${id}-max`}>
							<NumberInput
								id={`${id}-max`}
								value={question.maxLength}
								min={1}
								onChange={value => patch({ maxLength: value })}
								suffix="characters"
							/>
						</Field>
					)}

					{question.kind === "number" && (
						<>
							<Field label="Smallest" htmlFor={`${id}-min`}>
								<NumberInput
									id={`${id}-min`}
									value={question.min}
									onChange={value => patch({ min: value })}
								/>
							</Field>
							<Field label="Largest" htmlFor={`${id}-max`}>
								<NumberInput
									id={`${id}-max`}
									value={question.max}
									onChange={value => patch({ max: value })}
								/>
							</Field>
						</>
					)}
				</div>

				{isChoice && !question.dynamicFrom && (
					<OptionsEditor raw={raw} target={{ question: question.id }} onChange={onChange} />
				)}
				{question.dynamicFrom && <DynamicOptionsEditor raw={raw} question={question} onChange={onChange} />}
				{question.optionsPending !== undefined && (
					<p className="border-l-2 border-attention pl-base text-caption text-attention-text">
						◼ {question.optionsPending}
					</p>
				)}

				<ConditionEditor raw={raw} question={question} index={index} onChange={patch} />

				<Field
					label="Open protocol question"
					htmlFor={`${id}-flag`}
					detail="Shown to managers, never to observers. Resolve it when the research team has decided.">
					<TextArea
						id={`${id}-flag`}
						rows={2}
						value={question.protocolFlag ?? ""}
						placeholder="None"
						onChange={event =>
							patch({ protocolFlag: event.target.value === "" ? undefined : event.target.value })
						}
					/>
					{question.protocolFlag !== undefined && (
						<LinkAction onClick={() => patch({ protocolFlag: undefined })} className="mt-hair">
							✓ Mark resolved
						</LinkAction>
					)}
				</Field>

				<p className="text-micro text-neutral-600" translate="no">
					Stored as <span className="text-neutral-400">{question.id}</span> · workbook {question.code} ·{" "}
					{question.exportColumn === "" ? "no export column yet" : `exports to ${question.exportColumn}`} ·{" "}
					{question.source}
				</p>
			</div>

			<div className="mt-loose flex flex-wrap items-center gap-snug border-t border-edge pt-base">
				<GhostAction disabled={index <= 0} onClick={() => onChange(moveQuestion(raw, question.id, -1))}>
					↑ Earlier
				</GhostAction>
				<GhostAction
					disabled={index >= raw.questions.length - 1}
					onClick={() => onChange(moveQuestion(raw, question.id, 1))}>
					↓ Later
				</GhostAction>
				<span className="flex-1" />
				{confirmDelete ? (
					<span className="flex flex-wrap items-center gap-snug">
						<span className="text-caption text-attention-text">
							{dependents.length > 0
								? `${dependents.length} other question${dependents.length === 1 ? "" : "s"} depend on this one.`
								: "Remove this question from the draft?"}
						</span>
						<SecondaryAction
							tone="attention"
							onClick={() => {
								onChange(removeQuestion(raw, question.id));
								onRemoved();
							}}>
							Remove
						</SecondaryAction>
						<GhostAction onClick={() => setConfirmDelete(false)}>Keep</GhostAction>
					</span>
				) : (
					<GhostAction onClick={() => setConfirmDelete(true)}>Remove question</GhostAction>
				)}
			</div>
		</div>
	);
}

/** Changing kind resets what the old kind carried, so a text question never keeps stray options. */
function kindChange(question: RawQuestion, kind: QuestionKind): Partial<RawQuestion> {
	const choice = kind === "one" || kind === "many";
	return {
		kind,
		options: choice ? (question.options?.length ? question.options : [...STARTER_OPTIONS]) : undefined,
		columns: choice ? question.columns : undefined,
		maxLength: kind === "text" ? (question.maxLength ?? 200) : undefined,
		min: undefined,
		max: undefined
	};
}

/* ── Options ──────────────────────────────────────────────────────────────── */

function OptionsEditor({
	raw,
	target,
	onChange
}: {
	readonly raw: RawDefinition;
	readonly target: OptionTarget;
	readonly onChange: (next: RawDefinition) => void;
}) {
	const id = useId();
	const [draft, setDraft] = useState("");
	const question = raw.questions.find(candidate => candidate.id === target.question);
	if (!question) return null;
	const options = optionsOf(question, target.set);
	const add = () => {
		const label = draft.trim();
		if (label === "") return;
		onChange(addOption(raw, target, label));
		setDraft("");
	};

	return (
		<fieldset className="m-0 min-w-0 border-0 p-0">
			<legend className="mb-tight text-meta text-neutral-400">
				Options <span className="text-micro text-neutral-600">· the code is what a record stores</span>
			</legend>
			<ol className="m-0 list-none space-y-tight p-0">
				{options.map((option, position) => (
					<li key={option.code} className="flex items-center gap-snug">
						<span className="w-36 shrink-0 truncate font-mono text-micro text-neutral-500" translate="no">
							{option.code}
						</span>
						<Input
							aria-label={`Label for ${option.code}`}
							value={option.label}
							onChange={event => onChange(relabelOption(raw, target, option.code, event.target.value))}
						/>
						<IconButton
							label={`Move ${option.label} up`}
							disabled={position === 0}
							onClick={() => onChange(moveOption(raw, target, option.code, -1))}>
							↑
						</IconButton>
						<IconButton
							label={`Move ${option.label} down`}
							disabled={position === options.length - 1}
							onClick={() => onChange(moveOption(raw, target, option.code, 1))}>
							↓
						</IconButton>
						<IconButton
							label={`Remove ${option.label}`}
							onClick={() => onChange(removeOption(raw, target, option.code))}>
							×
						</IconButton>
					</li>
				))}
			</ol>
			<div className="mt-snug flex items-center gap-snug">
				<label htmlFor={`${id}-new`} className="sr-only">
					New option
				</label>
				<Input
					id={`${id}-new`}
					value={draft}
					placeholder="Add an option…"
					onChange={event => setDraft(event.target.value)}
					onKeyDown={event => {
						if (event.key === "Enter") {
							event.preventDefault();
							add();
						}
					}}
					className="min-h-11"
				/>
				<SecondaryAction onClick={add} disabled={draft.trim() === ""}>
					Add
				</SecondaryAction>
			</div>
		</fieldset>
	);
}

/** A subtype list follows its parent: one option set per parent answer, edited one set at a time. */
function DynamicOptionsEditor({
	raw,
	question,
	onChange
}: {
	readonly raw: RawDefinition;
	readonly question: RawQuestion;
	readonly onChange: (next: RawDefinition) => void;
}) {
	const dynamic = question.dynamicFrom;
	const parent = raw.questions.find(candidate => candidate.id === dynamic?.question);
	const keys = Object.keys(dynamic?.sets ?? {});
	const [set, setSet] = useState(keys[0] ?? "");
	if (!dynamic || !parent || keys.length === 0) return null;
	const active = keys.includes(set) ? set : keys[0];
	const labelFor = (code: string) => parent.options?.find(option => option.code === code)?.label ?? code;

	return (
		<div className="grid gap-snug">
			<p className="text-meta text-neutral-400">
				Options follow <span className="text-neutral-200">“{parent.label}”</span>
			</p>
			<div className="flex flex-wrap gap-tight" role="tablist" aria-label="Option set">
				{keys.map(key => (
					<button
						key={key}
						type="button"
						role="tab"
						aria-selected={key === active}
						onClick={() => setSet(key)}
						className={`min-h-9 rounded-md border-l-2 px-snug text-caption transition-colors duration-100 ${
							key === active
								? "border-l-accent-400 bg-accent-800 text-accent-100"
								: "border-l-transparent bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
						}`}>
						{labelFor(key)}{" "}
						<span className="tnum text-micro text-neutral-500">{dynamic.sets[key].options.length}</span>
					</button>
				))}
			</div>
			<OptionsEditor key={active} raw={raw} target={{ question: question.id, set: active }} onChange={onChange} />
		</div>
	);
}

/* ── Display rule ─────────────────────────────────────────────────────────── */

type RuleMode = "always" | "answered" | "matches" | "compound";

function ruleMode(condition: Condition | undefined): RuleMode {
	if (!condition) return "always";
	if (condition.kind === "answered") return "answered";
	if (condition.kind === "equals" || condition.kind === "includes") return "matches";
	return "compound";
}

/**
 * Rules are chosen from lists, never typed: a manager picks an earlier question and one of its
 * options, so a rule can only ever name something that exists. Compound workbook rules stay
 * read-only here and are shown as the sentence they mean.
 */
function ConditionEditor({
	raw,
	question,
	index,
	onChange
}: {
	readonly raw: RawDefinition;
	readonly question: RawQuestion;
	readonly index: number;
	readonly onChange: (change: Partial<RawQuestion>) => void;
}) {
	const id = useId();
	const condition = question.dependsOn as Condition | undefined;
	const mode = ruleMode(condition);
	const earlier = raw.questions.slice(0, Math.max(index, 0));
	const choices = earlier.filter(candidate => (candidate.options?.length ?? 0) > 0);

	const set = (next: RuleMode) => {
		if (next === "always") return onChange({ dependsOn: undefined, openedBy: undefined });
		if (next === "answered") {
			const target = earlier.at(-1);
			if (target) onChange({ dependsOn: { kind: "answered", question: target.id } });
			return;
		}
		const target = choices.at(-1);
		const option = target?.options?.[0];
		if (target && option)
			onChange({
				dependsOn: {
					kind: target.kind === "many" ? "includes" : "equals",
					question: target.id,
					option: option.code
				}
			});
	};

	const target =
		condition && "question" in condition
			? raw.questions.find(candidate => candidate.id === condition.question)
			: undefined;

	return (
		<fieldset className="m-0 min-w-0 border-0 p-0">
			<legend className="mb-tight text-meta text-neutral-400">When the observer sees this question</legend>
			{mode === "compound" && condition ? (
				<p className="border-l-2 border-accent pl-base text-detail text-neutral-300">
					↳ Shown when {describeCondition(raw, condition)}.{" "}
					<span className="text-micro text-neutral-500">
						A compound rule from the workbook; edit it in the file.
					</span>
				</p>
			) : (
				<div className="flex flex-wrap items-center gap-snug">
					<Segmented
						label="Rule"
						value={mode}
						options={[
							{ value: "always", label: "Always" },
							{
								value: "answered",
								label: "After a question is answered",
								disabled: earlier.length === 0
							},
							{ value: "matches", label: "When an answer is…", disabled: choices.length === 0 }
						]}
						onChange={next => set(next as RuleMode)}
					/>
					{mode !== "always" && condition && "question" in condition && (
						<div className="flex flex-wrap items-center gap-snug">
							<label className="sr-only" htmlFor={`${id}-q`}>
								Earlier question
							</label>
							<Select
								id={`${id}-q`}
								value={condition.question}
								onChange={event => {
									const picked = raw.questions.find(candidate => candidate.id === event.target.value);
									if (!picked) return;
									if (mode === "answered")
										onChange({ dependsOn: { kind: "answered", question: picked.id } });
									else {
										const first = picked.options?.[0];
										if (first)
											onChange({
												dependsOn: {
													kind: picked.kind === "many" ? "includes" : "equals",
													question: picked.id,
													option: first.code
												}
											});
									}
								}}>
								{(mode === "answered" ? earlier : choices).map(candidate => (
									<option key={candidate.id} value={candidate.id}>
										{candidate.label}
									</option>
								))}
							</Select>
							{mode === "matches" && "option" in condition && target && (
								<>
									<span className="text-caption text-neutral-500">
										{target.kind === "many" ? "includes" : "is"}
									</span>
									<label className="sr-only" htmlFor={`${id}-o`}>
										Answer
									</label>
									<Select
										id={`${id}-o`}
										value={condition.option}
										onChange={event =>
											onChange({
												dependsOn: { ...condition, option: event.target.value } as Condition
											})
										}>
										{(target.options ?? []).map(option => (
											<option key={option.code} value={option.code}>
												{option.label}
											</option>
										))}
									</Select>
								</>
							)}
						</div>
					)}
				</div>
			)}
		</fieldset>
	);
}

/* ── Small controls, scoped to the studio ─────────────────────────────────── */

function Field({
	label,
	htmlFor,
	detail,
	children
}: {
	readonly label: string;
	readonly htmlFor?: string;
	readonly detail?: string;
	readonly children: ReactNode;
}) {
	return (
		<div className="min-w-0">
			{htmlFor === undefined ? (
				<p className="mb-tight text-meta text-neutral-400">{label}</p>
			) : (
				<label htmlFor={htmlFor} className="mb-tight block text-meta text-neutral-400">
					{label}
				</label>
			)}
			{children}
			{detail !== undefined && <p className="mt-hair text-micro text-neutral-600">{detail}</p>}
		</div>
	);
}

const CONTROL =
	"w-full rounded-md border border-rule bg-raised px-snug py-tight text-detail text-text caret-accent transition-colors duration-100 placeholder:text-neutral-600 hover:border-neutral-500 focus-visible:border-accent focus-visible:outline-offset-0";

function TextArea(props: ComponentPropsWithoutRef<"textarea">) {
	return <textarea {...props} className={`${CONTROL} resize-y`} />;
}

function Select(props: ComponentPropsWithoutRef<"select">) {
	return <select {...props} className={`${CONTROL} min-h-11 w-auto max-w-[22rem]`} />;
}

function NumberInput({
	id,
	value,
	min,
	suffix,
	onChange
}: {
	readonly id: string;
	readonly value: number | undefined;
	readonly min?: number;
	readonly suffix?: string;
	readonly onChange: (value: number | undefined) => void;
}) {
	return (
		<span className="flex items-center gap-tight">
			<Input
				id={id}
				type="number"
				inputMode="numeric"
				min={min}
				value={value ?? ""}
				onChange={event => {
					const parsed = Number.parseInt(event.target.value, 10);
					onChange(Number.isNaN(parsed) ? undefined : parsed);
				}}
				className="tnum min-h-11 w-24"
			/>
			{suffix !== undefined && <span className="text-caption text-neutral-500">{suffix}</span>}
		</span>
	);
}

function Segmented<T extends string>({
	label,
	value,
	options,
	onChange
}: {
	readonly label: string;
	readonly value: T;
	readonly options: readonly { readonly value: T; readonly label: string; readonly disabled?: boolean }[];
	readonly onChange: (value: T) => void;
}) {
	return (
		<div
			role="radiogroup"
			aria-label={label}
			className="inline-flex flex-wrap gap-hair rounded-md bg-neutral-900 p-hair">
			{options.map(option => (
				<button
					key={option.value}
					type="button"
					role="radio"
					aria-checked={option.value === value}
					disabled={option.disabled}
					onClick={() => onChange(option.value)}
					className={`min-h-10 rounded-sm px-snug text-caption transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-40 ${
						option.value === value
							? "bg-accent-800 text-accent-100 shadow-[inset_0_-2px_0_var(--color-accent-400)]"
							: "text-neutral-400 hover:bg-ink-tint hover:text-neutral-200"
					}`}>
					{option.label}
				</button>
			))}
		</div>
	);
}

function IconButton({
	label,
	disabled = false,
	onClick,
	children
}: {
	readonly label: string;
	readonly disabled?: boolean;
	readonly onClick: () => void;
	readonly children: ReactNode;
}) {
	return (
		<button
			type="button"
			aria-label={label}
			title={label}
			disabled={disabled}
			onClick={onClick}
			className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-body text-neutral-400 transition-colors duration-100 hover:bg-ink-tint hover:text-neutral-200 disabled:cursor-not-allowed disabled:opacity-30">
			{children}
		</button>
	);
}
