import { z } from "zod";

/**
 * A versioned form definition: stable identifiers, labels, constraints and a restricted
 * condition format, as required by `docs/Janet-Test-Form-Scope.md`.
 *
 * Conditions are data, never code. Workbook rule text is carried as provenance and is never
 * executed. Every reference is validated before a definition is used.
 */

export const ACTS = ["Child", "Social", "Play", "Setting", "Record"] as const;
export type Act = (typeof ACTS)[number];

export type Condition =
  | { readonly kind: "answered"; readonly question: string }
  | { readonly kind: "equals"; readonly question: string; readonly option: string }
  | { readonly kind: "notEquals"; readonly question: string; readonly option: string }
  | { readonly kind: "includes"; readonly question: string; readonly option: string }
  | { readonly kind: "all"; readonly of: readonly Condition[] }
  | { readonly kind: "any"; readonly of: readonly Condition[] };

const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.object({ kind: z.literal("answered"), question: z.string().min(1) }),
    z.object({
      kind: z.literal("equals"),
      question: z.string().min(1),
      option: z.string().min(1),
    }),
    z.object({
      kind: z.literal("notEquals"),
      question: z.string().min(1),
      option: z.string().min(1),
    }),
    z.object({
      kind: z.literal("includes"),
      question: z.string().min(1),
      option: z.string().min(1),
    }),
    z.object({ kind: z.literal("all"), of: z.array(conditionSchema).min(1) }),
    z.object({ kind: z.literal("any"), of: z.array(conditionSchema).min(1) }),
  ]),
);

export const optionSchema = z.object({
  /** Stable identifier stored in the record. Provisional until the workbook codes are approved. */
  code: z.string().min(1),
  label: z.string().min(1),
});
export type Option = Readonly<z.infer<typeof optionSchema>>;

const optionSetSchema = z.object({
  code: z.string().min(1),
  exportColumn: z.string(),
  label: z.string().min(1),
  options: z.array(optionSchema).min(1),
});

export const questionSchema = z.object({
  id: z.string().min(1),
  /** The variable code in the source workbook. */
  code: z.string().min(1),
  /** The analysis column. Empty when the source has not supplied one — never invented here. */
  exportColumn: z.string(),
  act: z.enum(ACTS),
  label: z.string().min(1),
  hint: z.string().min(1).optional(),
  kind: z.enum(["one", "many", "text", "number"]),
  options: z.array(optionSchema).default([]),
  /** Preferred option columns on a wide panel. Narrow layouts reduce this. */
  columns: z.number().int().min(1).max(4).default(1),
  required: z.boolean().default(false),
  dependsOn: conditionSchema.optional(),
  /** Human sentence shown on a question a previous answer revealed. */
  openedBy: z.string().min(1).optional(),
  /** Option sets chosen by another question's answer, e.g. a play subtype from a play type. */
  dynamicFrom: z
    .object({ question: z.string().min(1), sets: z.record(z.string(), optionSetSchema) })
    .optional(),
  placeholder: z.string().min(1).optional(),
  rows: z.number().int().min(1).max(8).optional(),
  maxLength: z.number().int().min(1).optional(),
  /** Whole-number bounds, for a `number` question. */
  min: z.number().int().optional(),
  max: z.number().int().optional(),
  /** Where this field comes from in the source workbook. */
  source: z.string().min(1),
  /** An unresolved protocol decision. Surfaced in the UI; never silently shipped. */
  protocolFlag: z.string().min(1).optional(),
  /** Set when the source has not supplied the option list yet. */
  optionsPending: z.string().min(1).optional(),
});
export type Question = Readonly<z.infer<typeof questionSchema>>;

export const protocolNoteSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  detail: z.string().min(1),
  source: z.string().min(1),
});
export type ProtocolNote = Readonly<z.infer<typeof protocolNoteSchema>>;

export const formDefinitionSchema = z.object({
  version: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  source: z.string().min(1),
  /** Only a published version may be uploaded; the API must accept it first. */
  status: z.enum(["draft", "published"]),
  /** Records the explicit inclusion decision, per the Janet scope document. */
  inclusion: z.string().min(1),
  /** Export columns the source reuses for two fields. Listed so validation stays meaningful. */
  knownExportCollisions: z.array(z.string()).default([]),
  protocolNotes: z.array(protocolNoteSchema).default([]),
  questions: z.array(questionSchema).min(1),
});
export type FormDefinition = Readonly<z.infer<typeof formDefinitionSchema>>;

export type AnswerValue = string | readonly string[];
export type Answers = Readonly<Record<string, AnswerValue>>;

function referencedQuestions(condition: Condition): readonly string[] {
  switch (condition.kind) {
    case "all":
    case "any":
      return condition.of.flatMap(referencedQuestions);
    default:
      return [condition.question];
  }
}

/** Every question a question depends on, through conditions and dynamic option sets. */
export function dependencies(question: Question): readonly string[] {
  const fromCondition = question.dependsOn ? referencedQuestions(question.dependsOn) : [];
  return question.dynamicFrom
    ? [...fromCondition, question.dynamicFrom.question]
    : [...fromCondition];
}

/**
 * Structural problems that must be resolved before a definition is used: duplicate
 * identifiers, colliding export columns, dangling references and dependency cycles.
 */
export function validateFormDefinition(form: FormDefinition): readonly string[] {
  const problems: string[] = [];
  const byId = new Map<string, Question>();
  for (const question of form.questions) {
    if (byId.has(question.id)) problems.push(`Duplicate question id "${question.id}".`);
    byId.set(question.id, question);
  }

  const columns = new Map<string, string>();
  const allowed = new Set(form.knownExportCollisions);
  for (const question of form.questions) {
    if (question.exportColumn === "") continue;
    const owner = columns.get(question.exportColumn);
    if (owner !== undefined && !allowed.has(question.exportColumn))
      problems.push(
        `Export column "${question.exportColumn}" is claimed by both "${owner}" and "${question.id}".`,
      );
    columns.set(question.exportColumn, question.id);
  }

  for (const question of form.questions) {
    if (question.optionsPending !== undefined && question.required)
      problems.push(`"${question.id}" is required but its option list has not been supplied.`);
    const isChoice = question.kind === "one" || question.kind === "many";
    if (isChoice && question.options.length === 0 && !question.dynamicFrom)
      if (question.optionsPending === undefined)
        problems.push(`"${question.id}" is a choice question with no options.`);
    if (!isChoice && question.options.length > 0)
      problems.push(`"${question.id}" is not a choice question but carries options.`);

    for (const reference of dependencies(question)) {
      const target = byId.get(reference);
      if (!target) {
        problems.push(`"${question.id}" references unknown question "${reference}".`);
        continue;
      }
      if (form.questions.indexOf(target) > form.questions.indexOf(question))
        problems.push(`"${question.id}" depends on "${reference}", which is authored after it.`);
    }

    const dynamic = question.dynamicFrom;
    if (!dynamic) continue;
    const parent = byId.get(dynamic.question);
    if (!parent) continue;
    if (parent.kind !== "one")
      problems.push(
        `"${question.id}" takes options from "${parent.id}", which is not a single choice.`,
      );
    const parentCodes = new Set(parent.options.map((option) => option.code));
    for (const key of Object.keys(dynamic.sets))
      if (!parentCodes.has(key))
        problems.push(
          `"${question.id}" has an option set for "${key}", which "${parent.id}" cannot answer.`,
        );
  }

  problems.push(...cycles(form, byId));
  return problems;
}

function cycles(form: FormDefinition, byId: ReadonlyMap<string, Question>): readonly string[] {
  const visiting = new Set<string>();
  const settled = new Set<string>();
  const found: string[] = [];
  const walk = (id: string, trail: readonly string[]): void => {
    if (settled.has(id)) return;
    if (visiting.has(id)) {
      found.push(`Dependency cycle: ${[...trail, id].join(" → ")}.`);
      return;
    }
    visiting.add(id);
    const question = byId.get(id);
    if (question) for (const reference of dependencies(question)) walk(reference, [...trail, id]);
    visiting.delete(id);
    settled.add(id);
  };
  for (const question of form.questions) walk(question.id, []);
  return found;
}

/** Parses and validates a definition, refusing to return an unusable one. */
export function parseFormDefinition(input: unknown): FormDefinition {
  const form = formDefinitionSchema.parse(input);
  const problems = validateFormDefinition(form);
  if (problems.length > 0)
    throw new Error(`Form "${form.version}" cannot be used: ${problems.join(" ")}`);
  return form;
}
