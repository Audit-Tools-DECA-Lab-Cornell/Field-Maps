import type { Answers, FormDefinition } from "../forms/definition";
import { pruneAnswers, reviewProblems } from "../forms/engine";
import {
  type Coordinate,
  instrumentObservationSchema,
  isShellObservation,
  type Observation,
  type Placement,
  type RoundContext,
  shellObservationSchema,
} from "./observation";
import { roundLabel } from "./rounds";

/**
 * Turns a completed question stack into a stored record. Each form version keeps its own record
 * shape: `shell-v1` writes the same three columns it always did, so existing practice records
 * and the API contract are untouched, while the instrument keeps its answers by question id
 * against its versioned definition.
 */

export type ObservationInput = {
  readonly id: string;
  readonly form: FormDefinition;
  readonly answers: Answers;
  readonly coordinates: Coordinate;
  readonly placement: Placement;
  readonly context: RoundContext;
  readonly siteId: string;
  readonly createdAt: string;
};

export type BuildResult =
  | { readonly ok: true; readonly record: Observation }
  | { readonly ok: false; readonly message: string };

function text(answers: Answers, id: string): string {
  const value = answers[id];
  return typeof value === "string" ? value : "";
}

export function buildObservation(input: ObservationInput): BuildResult {
  if (reviewProblems(input.form, input.answers).length > 0)
    return { ok: false, message: "Check the answers against the form requirements." };
  const { answers } = pruneAnswers(input.form, input.answers);
  const shared = {
    id: input.id,
    coordinates: input.coordinates,
    createdAt: input.createdAt,
    storageStatus: "local-only",
  };
  if (input.form.version === "shell-v1") {
    const { people } = answers;
    const parsed = shellObservationSchema.safeParse({
      ...shared,
      siteId: "sample-garden",
      formVersion: "shell-v1",
      observer: text(answers, "observer"),
      people,
      notes: text(answers, "notes"),
    });
    return parsed.success
      ? { ok: true, record: parsed.data }
      : { ok: false, message: parsed.error.issues[0]?.message ?? "Check the answers." };
  }
  {
    const observerQuestion = input.form.questions.find(
      (question) => question.exportColumn === "observer" && question.kind === "text",
    );
    const parsed = instrumentObservationSchema.safeParse({
      ...shared,
      siteId: input.siteId,
      formVersion: input.form.version,
      observer: observerQuestion ? text(answers, observerQuestion.id) : "",
      answers,
      context: input.context,
      placement: input.placement,
    });
    return parsed.success
      ? { ok: true, record: parsed.data }
      : { ok: false, message: parsed.error.issues[0]?.message ?? "Check the answers." };
  }
}

const SUMMARY_QUESTION = "play_event_summary";

/** The single line a record shows in the device list and in a map callout. */
export function observationSummary(record: Observation): string {
  if (isShellObservation(record))
    return record.notes !== ""
      ? record.notes
      : `${record.people} ${record.people === 1 ? "person" : "people"} observed`;
  const summary = record.answers[SUMMARY_QUESTION];
  return typeof summary === "string" && summary !== ""
    ? summary
    : `${record.context.zoneLabel} · ${roundLabel(record.context.roundType)}`;
}
