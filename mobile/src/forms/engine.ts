import type { Answers, AnswerValue, Condition, FormDefinition, Question } from "./definition";

/**
 * The reusable part: visibility, dynamic option sets, pruning and validation. It knows nothing
 * about Janet's instrument — every rule arrives as data in a versioned definition.
 */

export type ResolvedQuestion = Question;

export function isAnswered(value: AnswerValue | undefined): value is AnswerValue {
  if (value === undefined) return false;
  return typeof value === "string" ? value.trim() !== "" : value.length > 0;
}

function evaluate(condition: Condition, answers: Answers): boolean {
  switch (condition.kind) {
    case "answered":
      return isAnswered(answers[condition.question]);
    case "equals":
      return answers[condition.question] === condition.option;
    case "notEquals":
      return answers[condition.question] !== condition.option;
    case "includes": {
      const value = answers[condition.question];
      return Array.isArray(value) && value.includes(condition.option);
    }
    case "all":
      return condition.of.every((part) => evaluate(part, answers));
    case "any":
      return condition.of.some((part) => evaluate(part, answers));
  }
}

/** Applies a dynamic option set, so a play subtype follows the play type that was chosen. */
export function resolveQuestion(question: Question, answers: Answers): ResolvedQuestion {
  const dynamic = question.dynamicFrom;
  if (!dynamic) return question;
  const parentAnswer = answers[dynamic.question];
  const set = typeof parentAnswer === "string" ? dynamic.sets[parentAnswer] : undefined;
  if (!set) return { ...question, options: [] };
  return {
    ...question,
    code: set.code,
    exportColumn: set.exportColumn,
    label: set.label,
    options: set.options,
  };
}

/**
 * The questions currently asked, in authored order — so a question revealed by a new answer
 * appears where its author put it rather than at the end of the stack.
 */
export function visibleQuestions(
  form: FormDefinition,
  answers: Answers,
): readonly ResolvedQuestion[] {
  return form.questions
    .filter((question) => !question.dependsOn || evaluate(question.dependsOn, answers))
    .map((question) => resolveQuestion(question, answers));
}

function retainValue(question: ResolvedQuestion, value: AnswerValue): AnswerValue | null {
  if (question.kind === "text" || question.kind === "number")
    return typeof value === "string" && value.trim() !== "" ? value : null;
  const codes = new Set(question.options.map((option) => option.code));
  if (question.kind === "one") return typeof value === "string" && codes.has(value) ? value : null;
  if (!Array.isArray(value)) return null;
  const kept = value.filter((code) => codes.has(code));
  return kept.length > 0 ? kept : null;
}

export type Pruned = {
  readonly answers: Answers;
  /** The questions whose answers were removed, so the count and reason can be reported. */
  readonly dropped: readonly ResolvedQuestion[];
};

/**
 * Removes answers to questions that are no longer asked, and answers whose option no longer
 * exists after a parent changed. Repeats until stable, because dropping one answer can hide
 * the question that held the next. Data integrity: hidden answers are never saved silently.
 */
export function pruneAnswers(form: FormDefinition, answers: Answers): Pruned {
  const dropped: ResolvedQuestion[] = [];
  let current: Answers = answers;
  for (;;) {
    const visible = new Map(
      visibleQuestions(form, current).map((question) => [question.id, question] as const),
    );
    const next: Record<string, AnswerValue> = {};
    let changed = false;
    for (const [id, value] of Object.entries(current)) {
      const question = visible.get(id);
      const kept = question ? retainValue(question, value) : null;
      if (kept === null) {
        changed = true;
        const authored = form.questions.find((candidate) => candidate.id === id);
        if (authored) dropped.push(question ?? resolveQuestion(authored, current));
        continue;
      }
      next[id] = kept;
    }
    current = next;
    if (!changed) return { answers: current, dropped };
  }
}

export type ReviewProblem = {
  readonly question: ResolvedQuestion;
  readonly reason: "required" | "range";
};

/**
 * What blocks a save. Validation happens only at review, never while a question is on screen:
 * an empty required answer is named on its own row rather than interrupting the stack.
 */
export function reviewProblems(form: FormDefinition, answers: Answers): readonly ReviewProblem[] {
  const problems: ReviewProblem[] = [];
  for (const question of visibleQuestions(form, answers)) {
    const value = answers[question.id];
    if (!isAnswered(value)) {
      if (question.required) problems.push({ question, reason: "required" });
      continue;
    }
    if (question.kind !== "number" || typeof value !== "string") continue;
    const count = Number(value);
    const below = question.min !== undefined && count < question.min;
    const above = question.max !== undefined && count > question.max;
    if (!Number.isInteger(count) || below || above) problems.push({ question, reason: "range" });
  }
  return problems;
}

/** Required questions that are visible and still empty. */
export function missingRequired(
  form: FormDefinition,
  answers: Answers,
): readonly ResolvedQuestion[] {
  return reviewProblems(form, answers)
    .filter((problem) => problem.reason === "required")
    .map((problem) => problem.question);
}

export function optionLabel(question: ResolvedQuestion, code: string): string {
  return question.options.find((option) => option.code === code)?.label ?? code;
}

/** What the reviewer reads on the review sheet. */
export function answerSummary(question: ResolvedQuestion, value: AnswerValue | undefined): string {
  if (!isAnswered(value)) return question.required ? "Required" : "Not answered";
  if (typeof value === "string")
    return question.kind === "one" ? optionLabel(question, value) : value;
  return value.map((code) => optionLabel(question, code)).join(", ");
}

export type ExportedAnswers = {
  readonly columns: Readonly<Record<string, string | readonly string[]>>;
  /** Answers with no approved export column yet, named so the gap stays visible. */
  readonly withoutColumn: readonly ResolvedQuestion[];
};

/**
 * Maps answers onto the source workbook's analysis columns using stable option codes.
 * A question whose export name is still an open protocol decision is reported, not guessed.
 */
export function exportAnswers(form: FormDefinition, answers: Answers): ExportedAnswers {
  const columns: Record<string, string | readonly string[]> = {};
  const withoutColumn: ResolvedQuestion[] = [];
  for (const question of visibleQuestions(form, answers)) {
    const value = answers[question.id];
    if (!isAnswered(value)) continue;
    if (question.exportColumn === "") {
      withoutColumn.push(question);
      continue;
    }
    columns[question.exportColumn] = value;
  }
  return { columns, withoutColumn };
}
