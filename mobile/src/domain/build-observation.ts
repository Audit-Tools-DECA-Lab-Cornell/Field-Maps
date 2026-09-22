import type { Answers, FormDefinition } from "../forms/definition";
import {
  type Coordinate,
  instrumentObservationSchema,
  type Observation,
  type Placement,
  type RoundContext,
  shellObservationSchema,
} from "./observation";

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
  const shared = {
    id: input.id,
    coordinates: input.coordinates,
    createdAt: input.createdAt,
    storageStatus: "local-only",
  };
  if (input.form.version === "shell-v1") {
    const count = Number(text(input.answers, "people"));
    const parsed = shellObservationSchema.safeParse({
      ...shared,
      siteId: "sample-garden",
      formVersion: "shell-v1",
      observer: text(input.answers, "observer"),
      people: Number.isInteger(count) ? count : Number.NaN,
      notes: text(input.answers, "notes"),
    });
    return parsed.success
      ? { ok: true, record: parsed.data }
      : { ok: false, message: parsed.error.issues[0]?.message ?? "Check the answers." };
  }
  if (input.form.version === "janet-test-v1") {
    const parsed = instrumentObservationSchema.safeParse({
      ...shared,
      siteId: input.siteId,
      formVersion: "janet-test-v1",
      observer: text(input.answers, "observer_initials"),
      answers: input.answers,
      context: input.context,
      placement: input.placement,
    });
    return parsed.success
      ? { ok: true, record: parsed.data }
      : { ok: false, message: parsed.error.issues[0]?.message ?? "Check the answers." };
  }
  return {
    ok: false,
    message: `This build cannot store records for form "${input.form.version}".`,
  };
}

const SUMMARY_QUESTION = "play_event_summary";

/** The single line a record shows in the device list and in a map callout. */
export function observationSummary(record: Observation): string {
  if (record.formVersion === "shell-v1")
    return record.notes !== ""
      ? record.notes
      : `${record.people} ${record.people === 1 ? "person" : "people"} observed`;
  const summary = record.answers[SUMMARY_QUESTION];
  return typeof summary === "string" && summary !== ""
    ? summary
    : `${record.context.zoneLabel} · round ${record.context.round}`;
}
