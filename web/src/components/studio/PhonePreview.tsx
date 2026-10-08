"use client";

import type { JSX, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
	AccentNote,
	AttentionNote,
	Chip,
	FadeRule,
	GhostAction,
	LinkAction,
	PrimaryAction,
	Prose,
	SectionLabel
} from "@/components/nocturne/chrome";
import {
	type Act,
	type Answers,
	answerSummary,
	type AnswerValue,
	exportAnswers,
	type FormDefinition,
	isAnswered,
	pruneAnswers,
	type ResolvedQuestion,
	type ReviewProblem,
	reviewProblems,
	visibleQuestions
} from "@/lib/forms";

/**
 * A live phone/tablet mock of the collector, driven by the same engine the device runs:
 * `visibleQuestions`, `pruneAnswers`, `reviewProblems`, `exportAnswers`. A manager editing the
 * instrument on the Form Studio outline sees, beside it, exactly what the observer will see —
 * down to the auto-advance on a single choice and the export columns an answer lands in.
 *
 * This component owns no server or device state: answers live only here, reset on an explicit
 * "Start next observation" or "Restart", and pruned whenever the definition itself changes shape.
 */

type Screen = "asking" | "review" | "saved";
type Frame = "phone" | "tablet";

const OBSERVER_QUESTION_ID = "observer_initials";
const AUTO_ADVANCE_MS = 160;

export function PhonePreview(props: {
	readonly form: FormDefinition;
	readonly focusQuestionId?: string | null;
	readonly onQuestionShown?: (id: string | null) => void;
}): JSX.Element {
	const { form, onQuestionShown } = props;
	const focusQuestionId = props.focusQuestionId ?? null;

	const [answers, setAnswers] = useState<Answers>({});
	const [index, setIndex] = useState(0);
	const [screen, setScreen] = useState<Screen>("asking");
	const [frame, setFrame] = useState<Frame>("phone");
	const [savedAnswers, setSavedAnswers] = useState<Answers>({});
	const [blocked, setBlocked] = useState<readonly ReviewProblem[]>([]);

	const visible = useMemo(() => visibleQuestions(form, answers), [form, answers]);
	const safeIndex = Math.min(index, Math.max(visible.length - 1, 0));
	const current = visible[safeIndex] as ResolvedQuestion | undefined;

	// Kept in sync so effects that must not fire on every answer can still read the latest one.
	const answersRef = useRef(answers);
	useEffect(() => {
		answersRef.current = answers;
	}, [answers]);

	const visibleRef = useRef(visible);
	useEffect(() => {
		visibleRef.current = visible;
	}, [visible]);

	// The manager edited the definition: prune answers to the new shape and clamp the index.
	// A full reset only happens if nothing is visible any more — otherwise position is kept.
	const prevFormRef = useRef(form);
	useEffect(() => {
		if (prevFormRef.current === form) return;
		prevFormRef.current = form;
		const { answers: pruned } = pruneAnswers(form, answersRef.current);
		const nextVisible = visibleQuestions(form, pruned);
		if (nextVisible.length === 0) {
			setAnswers({});
			setIndex(0);
			setScreen("asking");
			setSavedAnswers({});
			setBlocked([]);
			return;
		}
		setAnswers(pruned);
		setIndex(value => Math.min(value, nextVisible.length - 1));
	}, [form]);

	// An outline click: jump to the question if it is currently visible, otherwise hold position.
	const prevFocusRef = useRef<string | null>(null);
	useEffect(() => {
		if (focusQuestionId === prevFocusRef.current) return;
		prevFocusRef.current = focusQuestionId;
		if (focusQuestionId === null) return;
		const target = visibleRef.current.findIndex(question => question.id === focusQuestionId);
		if (target === -1) return;
		setIndex(target);
		setScreen("asking");
		setBlocked([]);
	}, [focusQuestionId]);

	useEffect(() => {
		onQuestionShown?.(screen === "asking" ? (current?.id ?? null) : null);
	}, [screen, current?.id, onQuestionShown]);

	const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(
		() => () => {
			if (advanceTimer.current) clearTimeout(advanceTimer.current);
		},
		[]
	);

	function commit(
		question: ResolvedQuestion,
		value: AnswerValue | undefined
	): { readonly list: readonly ResolvedQuestion[]; readonly at: number } {
		const draft: Record<string, AnswerValue> = { ...answersRef.current };
		if (value === undefined) delete draft[question.id];
		else draft[question.id] = value;
		const { answers: pruned } = pruneAnswers(form, draft);
		const list = visibleQuestions(form, pruned);
		const found = list.findIndex(item => item.id === question.id);
		const at = found === -1 ? Math.min(safeIndex, Math.max(list.length - 1, 0)) : found;
		setAnswers(pruned);
		setIndex(at);
		return { list, at };
	}

	function advanceOrReview(list: readonly ResolvedQuestion[], at: number) {
		if (at + 1 >= list.length) setScreen("review");
		else setIndex(at + 1);
	}

	function choose(question: ResolvedQuestion, option: string) {
		const already = answersRef.current[question.id] === option;
		const { list, at } = commit(question, already ? undefined : option);
		if (already) return;
		if (advanceTimer.current) clearTimeout(advanceTimer.current);
		advanceTimer.current = setTimeout(() => advanceOrReview(list, at), AUTO_ADVANCE_MS);
	}

	function toggle(question: ResolvedQuestion, option: string) {
		const value = answersRef.current[question.id];
		const selected = Array.isArray(value) ? value : [];
		const next = selected.includes(option) ? selected.filter(code => code !== option) : [...selected, option];
		commit(question, next.length > 0 ? next : undefined);
	}

	function write(question: ResolvedQuestion, raw: string) {
		const cleaned = question.kind === "number" ? raw.replace(/[^0-9]/g, "") : raw;
		const value: AnswerValue | undefined =
			cleaned.trim() === "" ? undefined : question.kind === "number" ? Number(cleaned) : cleaned;
		commit(question, value);
	}

	function handleContinue() {
		advanceOrReview(visible, safeIndex);
	}

	function handleBack() {
		setIndex(value => Math.max(0, value - 1));
	}

	function jumpTo(target: number) {
		setIndex(target);
		setScreen("asking");
		setBlocked([]);
	}

	function handleKeepAnswering() {
		setScreen("asking");
		setBlocked([]);
	}

	function handleSave() {
		const problems = reviewProblems(form, answersRef.current);
		if (problems.length > 0) {
			setBlocked(problems);
			return;
		}
		setBlocked([]);
		setSavedAnswers(answersRef.current);
		setScreen("saved");
	}

	function handleStartNext() {
		const carriesObserver = form.questions.some(question => question.id === OBSERVER_QUESTION_ID);
		const observer = answersRef.current[OBSERVER_QUESTION_ID];
		const draft: Record<string, AnswerValue> = {};
		if (carriesObserver && observer !== undefined) draft[OBSERVER_QUESTION_ID] = observer;
		const { answers: pruned } = pruneAnswers(form, draft);
		setAnswers(pruned);
		setIndex(0);
		setScreen("asking");
		setSavedAnswers({});
		setBlocked([]);
	}

	function handleRestart() {
		setAnswers({});
		setIndex(0);
		setScreen("asking");
		setSavedAnswers({});
		setBlocked([]);
	}

	const frameShell =
		frame === "phone"
			? "max-w-[390px] aspect-[390/780] rounded-[44px] lg:h-[780px] lg:w-[390px]"
			: "max-w-[760px] aspect-[760/540] rounded-[28px] lg:h-[540px] lg:w-[760px]";

	return (
		<div className="flex flex-col items-center gap-base">
			<div
				className="inline-flex gap-hair rounded-md border border-rule p-hair"
				role="group"
				aria-label="Preview device size">
				{(["phone", "tablet"] as const).map(option => (
					<button
						key={option}
						type="button"
						onClick={() => setFrame(option)}
						aria-pressed={frame === option}
						className={`rounded-sm px-snug py-hair text-micro capitalize transition-colors duration-100 ${
							frame === option
								? "bg-accent-800 text-accent-100"
								: "text-neutral-400 hover:text-neutral-200"
						}`}>
						{option}
					</button>
				))}
			</div>

			<div
				role="region"
				aria-label="Collector preview"
				className={`relative mx-auto w-full overflow-hidden border border-neutral-800 bg-bg shadow-lg ${frameShell}`}>
				<div className="absolute inset-0 flex flex-col text-text">
					<StatusBar />
					<p className="shrink-0 px-base pb-tight text-micro text-neutral-500">
						Riverside Play Study · Zone B · Round 2
					</p>

					{screen === "asking" ? (
						<div className={`flex min-h-0 flex-1 ${frame === "tablet" ? "flex-row" : "flex-col"}`}>
							<MapStrip
								className={frame === "tablet" ? "h-full w-[45%] shrink-0" : "h-[22%] w-full shrink-0"}
							/>
							<div
								className={`flex min-h-0 min-w-0 flex-1 flex-col border-edge ${
									frame === "tablet" ? "border-l" : "border-t"
								}`}>
								{current ? (
									<AskingPanel
										acts={formActs(props.form)}
										question={current}
										value={answers[current.id]}
										position={safeIndex + 1}
										total={visible.length}
										columns={Math.max(1, Math.min(current.columns, frame === "tablet" ? 4 : 2))}
										canBack={safeIndex > 0}
										onChoose={option => choose(current, option)}
										onToggle={option => toggle(current, option)}
										onWrite={value => write(current, value)}
										onBack={handleBack}
										onContinue={handleContinue}
									/>
								) : (
									<div className="flex min-h-0 flex-1 flex-col items-start justify-center gap-tight px-base">
										<p className="text-body text-neutral-300">No questions to show</p>
										<Prose tone="faint">
											The draft has no visible questions for this preview yet.
										</Prose>
									</div>
								)}
							</div>
						</div>
					) : screen === "review" ? (
						<ReviewPanel
							visible={visible}
							answers={answers}
							blocked={blocked}
							onBack={handleKeepAnswering}
							onJump={jumpTo}
							onSave={handleSave}
						/>
					) : (
						<SavedPanel form={form} savedAnswers={savedAnswers} onStartNext={handleStartNext} />
					)}
				</div>
			</div>

			<LinkAction onClick={handleRestart} muted>
				Restart
			</LinkAction>
			<p className="max-w-[44ch] text-center text-micro text-neutral-500">
				Same engine as the collector: visibility, option sets and pruning run from this definition.
			</p>
		</div>
	);
}

/* ── Status bar and map chrome ───────────────────────────────────────────── */

function StatusBar() {
	return (
		<div className="flex shrink-0 items-center justify-between px-base pt-tight pb-hair" aria-hidden="true">
			<span className="tnum text-micro font-medium text-text">9:41</span>
			<div className="flex items-center gap-tight">
				<span className="flex items-end gap-[1px]">
					<span className="h-[4px] w-[3px] rounded-[1px] bg-neutral-400" />
					<span className="h-[6px] w-[3px] rounded-[1px] bg-neutral-400" />
					<span className="h-[8px] w-[3px] rounded-[1px] bg-neutral-300" />
					<span className="h-[10px] w-[3px] rounded-[1px] bg-neutral-300" />
				</span>
				<span className="relative h-[10px] w-[20px] rounded-[3px] border border-neutral-400">
					<span className="absolute inset-y-[1.5px] left-[1.5px] right-[4px] rounded-[1px] bg-neutral-300" />
					<span className="absolute top-1/2 -right-[3px] h-[4px] w-[2px] -translate-y-1/2 rounded-r-[1px] bg-neutral-400" />
				</span>
			</div>
		</div>
	);
}

function MapStrip({ className = "" }: { readonly className?: string }) {
	return (
		<div className={`relative overflow-hidden bg-map ${className}`} aria-hidden="true">
			<span className="absolute left-[38%] top-[45%] size-[10px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent-400 bg-accent-800" />
			<p className="absolute bottom-snug left-snug text-micro text-neutral-400">Point placed · Zone B</p>
		</div>
	);
}

/**
 * A short opacity-only fade (≤150ms) played once per `fadeKey`. Remounting on a key change, rather
 * than resetting state inside an effect, keeps the very first paint hidden without ever calling
 * `setState` synchronously in an effect body. `prefers-reduced-motion` zeroes it globally.
 */
function FadeIn({
	fadeKey,
	className = "",
	children
}: {
	readonly fadeKey: string;
	readonly className?: string;
	readonly children: ReactNode;
}) {
	return (
		<FadeInFrame key={fadeKey} className={className}>
			{children}
		</FadeInFrame>
	);
}

function FadeInFrame({ className = "", children }: { readonly className?: string; readonly children: ReactNode }) {
	const [entered, setEntered] = useState(false);
	useEffect(() => {
		const id = requestAnimationFrame(() => setEntered(true));
		return () => cancelAnimationFrame(id);
	}, []);
	return (
		<div className={`transition-opacity duration-150 ${entered ? "opacity-100" : "opacity-0"} ${className}`}>
			{children}
		</div>
	);
}

/* ── Asking screen ────────────────────────────────────────────────────────── */

function PhoneOption({
	label,
	selected,
	onClick
}: {
	readonly label: string;
	readonly selected: boolean;
	readonly onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={selected}
			className={`min-h-11 rounded-md border-l-2 px-snug py-tight text-left text-caption transition-colors duration-100 ${
				selected
					? "border-l-accent-400 bg-accent-800 font-medium text-accent-100"
					: "border-l-transparent bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
			}`}>
			{label}
		</button>
	);
}

/** The acts a form actually asks, in order, so the progress bar has one segment per act it uses. */
function formActs(form: FormDefinition): readonly Act[] {
	const acts: Act[] = [];
	for (const question of form.questions) if (!acts.includes(question.act)) acts.push(question.act);
	return acts;
}

function AskingPanel({
	acts,
	question,
	value,
	position,
	total,
	columns,
	canBack,
	onChoose,
	onToggle,
	onWrite,
	onBack,
	onContinue
}: {
	readonly acts: readonly Act[];
	readonly question: ResolvedQuestion;
	readonly value: AnswerValue | undefined;
	readonly position: number;
	readonly total: number;
	readonly columns: number;
	readonly canBack: boolean;
	readonly onChoose: (option: string) => void;
	readonly onToggle: (option: string) => void;
	readonly onWrite: (value: string) => void;
	readonly onBack: () => void;
	readonly onContinue: () => void;
}) {
	const actIndex = acts.indexOf(question.act);
	const selectedOne = typeof value === "string" ? value : "";
	const selectedMany = Array.isArray(value) ? value : [];
	const textValue = typeof value === "string" || typeof value === "number" ? String(value) : "";

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="flex shrink-0 gap-hair px-base pt-snug" aria-hidden="true">
				{acts.map((act, i) => (
					<span
						key={act}
						className={`h-[3px] flex-1 rounded-full ${
							i < actIndex ? "bg-accent-700" : i === actIndex ? "bg-accent" : "bg-neutral-900"
						}`}
					/>
				))}
			</div>

			<FadeIn fadeKey={question.id} className="min-h-0 flex-1 overflow-y-auto px-base pt-snug pb-snug">
				<div className="flex items-baseline justify-between gap-base">
					<span className="text-caption text-accent-300">{question.act}</span>
					<span className="text-caption text-neutral-500">
						Question {position} of {total}
					</span>
				</div>

				<p className="mt-tight text-question font-medium text-text">{question.label}</p>

				{question.hint !== undefined && (
					<div className="mt-hair">
						<Prose>{question.hint}</Prose>
					</div>
				)}

				{question.openedBy !== undefined && (
					<div className="mt-tight">
						<AccentNote>
							<p className="text-caption text-accent-300">{question.openedBy}</p>
						</AccentNote>
					</div>
				)}

				{(question.kind === "one" || question.kind === "many") && question.options.length > 0 && (
					<div
						className="mt-base grid gap-tight"
						style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
						{question.options.map(option => (
							<PhoneOption
								key={option.code}
								label={option.label}
								selected={
									question.kind === "one"
										? selectedOne === option.code
										: selectedMany.includes(option.code)
								}
								onClick={() =>
									question.kind === "one" ? onChoose(option.code) : onToggle(option.code)
								}
							/>
						))}
					</div>
				)}

				{question.optionsPending !== undefined && (
					<div className="mt-base">
						<AttentionNote title="No option list yet" body={question.optionsPending} />
					</div>
				)}

				{question.kind === "text" && (
					<div className="mt-base">
						<textarea
							aria-label={question.label}
							value={textValue}
							maxLength={question.maxLength}
							rows={question.rows ?? 3}
							placeholder={question.placeholder}
							onChange={event => onWrite(event.target.value)}
							className="w-full resize-none rounded-md border border-rule bg-raised px-snug py-tight text-detail text-text placeholder:text-neutral-600 focus-visible:border-accent"
						/>
						{question.maxLength !== undefined && (
							<p className="tnum mt-hair text-right text-micro text-neutral-500">
								{textValue.length}/{question.maxLength}
							</p>
						)}
					</div>
				)}

				{question.kind === "number" && (
					<input
						type="number"
						inputMode="numeric"
						aria-label={question.label}
						value={textValue}
						min={question.min}
						max={question.max}
						placeholder={question.placeholder}
						onChange={event => onWrite(event.target.value)}
						className="mt-base w-full rounded-md border border-rule bg-raised px-snug py-tight text-detail text-text placeholder:text-neutral-600 focus-visible:border-accent"
					/>
				)}

				{question.protocolFlag !== undefined && (
					<div className="mt-base">
						<AttentionNote title="Protocol note (managers only)" body={question.protocolFlag} />
					</div>
				)}
			</FadeIn>

			<div className="flex shrink-0 items-center justify-between gap-snug border-t border-edge px-base py-snug">
				<GhostAction onClick={onBack} disabled={!canBack}>
					← Back
				</GhostAction>
				<PrimaryAction onClick={onContinue}>{position >= total ? "Review" : "Continue"}</PrimaryAction>
			</div>
		</div>
	);
}

/* ── Review screen ────────────────────────────────────────────────────────── */

function ReviewPanel({
	visible,
	answers,
	blocked,
	onBack,
	onJump,
	onSave
}: {
	readonly visible: readonly ResolvedQuestion[];
	readonly answers: Answers;
	readonly blocked: readonly ReviewProblem[];
	readonly onBack: () => void;
	readonly onJump: (index: number) => void;
	readonly onSave: () => void;
}) {
	const answered = visible.filter(question => isAnswered(answers[question.id])).length;
	// A group label shows only on the first row of each act, found by comparing to the row
	// before it — never by mutating a variable across the render.
	const rows = visible.map((question, idx) => ({
		question,
		idx,
		group: idx === 0 || visible[idx - 1].act !== question.act ? question.act : ""
	}));

	return (
		<FadeIn fadeKey="review" className="flex min-h-0 flex-1 flex-col">
			<div className="min-h-0 flex-1 overflow-y-auto px-base pt-base pb-snug">
				<LinkAction onClick={onBack} muted className="inline-flex min-h-11 items-center">
					← Keep answering
				</LinkAction>
				<p className="mt-snug text-heading text-text">Before you save</p>
				<p className="tnum mt-hair text-micro text-neutral-500">
					{answered} of {visible.length} questions answered
				</p>

				{blocked.length > 0 && (
					<div className="mt-base">
						<AttentionNote
							alert
							title={`${blocked.length} ${blocked.length === 1 ? "answer needs" : "answers need"} attention`}
							body="Check the highlighted answers below before saving."
						/>
					</div>
				)}

				<div className="mt-base">
					{rows.map(({ question, idx, group }) => {
						const value = answers[question.id];
						const flagged = blocked.some(problem => problem.question.id === question.id);
						const empty = !isAnswered(value);
						return (
							<div key={question.id}>
								{group !== "" && (
									<p className="mt-base mb-hair text-caption text-accent-300">{group}</p>
								)}
								<button
									type="button"
									onClick={() => onJump(idx)}
									className="flex min-h-11 w-full items-baseline justify-between gap-base border-b border-rule-faint py-snug text-left">
									<span className="min-w-0 flex-1 truncate text-caption text-neutral-400">
										{question.label}
									</span>
									<span
										className={`max-w-[46%] shrink-0 text-right text-detail font-medium ${
											flagged ? "text-attention-text" : empty ? "text-neutral-500" : "text-text"
										}`}>
										{answerSummary(question, value)}
									</span>
								</button>
							</div>
						);
					})}
				</div>
			</div>

			<div className="shrink-0 border-t border-edge px-base py-snug">
				<PrimaryAction onClick={onSave} className="w-full">
					Save observation
				</PrimaryAction>
			</div>
		</FadeIn>
	);
}

/* ── Saved screen ─────────────────────────────────────────────────────────── */

function formatExportValue(value: AnswerValue): string {
	return Array.isArray(value) ? value.join(", ") : String(value);
}

function SavedPanel({
	form,
	savedAnswers,
	onStartNext
}: {
	readonly form: FormDefinition;
	readonly savedAnswers: Answers;
	readonly onStartNext: () => void;
}) {
	const { columns, withoutColumn } = exportAnswers(form, savedAnswers);
	const rows = Object.entries(columns);

	return (
		<FadeIn fadeKey="saved" className="min-h-0 flex-1 overflow-y-auto px-base pt-base pb-snug">
			<Chip tone="live" glyph="◷">
				Saved on this device · waiting to upload
			</Chip>
			<p className="mt-base text-heading text-text">Saved</p>
			<Prose className="mt-hair">
				Practice records stay on this device until this draft form version is published.
			</Prose>

			<PrimaryAction onClick={onStartNext} className="mt-base w-full">
				Start next observation
			</PrimaryAction>

			<FadeRule fade={16} />

			<SectionLabel>What lands in the export</SectionLabel>
			<div className="mt-tight space-y-hair font-mono text-micro text-neutral-300">
				{rows.length === 0 && <p className="font-sans text-neutral-500">Nothing answered yet.</p>}
				{rows.map(([column, value]) => (
					<p key={column} className="truncate">
						<span className="text-neutral-500">{column}</span> = {formatExportValue(value)}
					</p>
				))}
			</div>
			{withoutColumn.length > 0 && (
				<p className="mt-tight text-micro text-attention-text">
					{withoutColumn.map(question => question.code).join(", ")} — no export column yet
				</p>
			)}
		</FadeIn>
	);
}
