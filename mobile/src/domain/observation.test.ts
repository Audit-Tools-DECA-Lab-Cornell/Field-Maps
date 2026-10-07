import { describe, expect, it } from "vitest";
import { questionSchema } from "../forms/definition";
import { janetTestV1 } from "../forms/fixtures/janet-test-v1";
import { shellV1 } from "../forms/fixtures/shell-v1";
import { buildObservation, type ObservationInput } from "./build-observation";
import {
  coordinateSchema,
  countInputSchema,
  placementSchema,
  roundContextSchema,
  shellObservationSchema,
} from "./observation";

describe("Observation boundaries", () => {
  const input: ObservationInput = {
    id: "83f254b5-8a7b-4b71-9591-a7ff880f4ad7",
    form: shellV1,
    answers: { observer: "JL", people: 0 },
    coordinates: [-76.485, 42.448],
    placement: { source: "hand", gpsAccuracyMetres: null },
    context: {
      packageId: "test",
      packageVersion: "v1",
      zoneId: "A",
      zoneLabel: "Zone A",
      roundType: "standard",
      freshPeriod: true,
      inheritedFrom: "",
    },
    siteId: "sample-garden",
    createdAt: "2026-09-29T10:00:00.000Z",
  };

  it("builds the unchanged practice record from a numeric answer", () => {
    const result = buildObservation(input);
    expect(result).toMatchObject({
      ok: true,
      record: { people: 0, observer: "JL", formVersion: "shell-v1" },
    });
    expect(buildObservation({ ...input, answers: { observer: "JL" } }).ok).toBe(false);
    expect(buildObservation({ ...input, answers: { observer: "JL", people: "2" } }).ok).toBe(false);
  });

  it("keeps numeric instrument answers through JSON serialization and drops hidden answers", () => {
    const form = {
      ...janetTestV1,
      questions: [
        ...janetTestV1.questions,
        questionSchema.parse({
          id: "test_count",
          code: "test_count",
          exportColumn: "",
          act: "Record",
          label: "Test count",
          kind: "number",
          source: "Synthetic builder test",
          min: 0,
          max: 9,
        }),
      ],
    };
    const result = buildObservation({
      ...input,
      form,
      answers: {
        age_range: "age_3_5",
        play_type_1: "physical",
        observer_initials: "JL",
        play_event_summary: "Playing",
        test_count: 2,
        wildlife_interaction: "no",
        wildlife_description: "Hidden",
      },
    });
    expect(JSON.parse(JSON.stringify(result))).toMatchObject({
      ok: true,
      record: { answers: { test_count: 2 } },
    });
    if (!result.ok || result.record.formVersion !== "janet-test-v1")
      throw new Error("Expected an instrument record");
    expect(result.record.answers).not.toHaveProperty("wildlife_description");
  });

  it("rejects an empty count instead of recording zero", () => {
    // Given an unanswered numeric question.
    const input = "";
    // When parsing the form value.
    const result = countInputSchema.safeParse(input);
    // Then it remains invalid, distinct from an intentional zero.
    expect(result.success).toBe(false);
    expect(countInputSchema.parse("0")).toBe(0);
  });

  it("rejects invalid map coordinates", () => {
    // Given a malformed coordinate from a route or map event.
    const input = [181, 42];
    // When parsing the location.
    const result = coordinateSchema.safeParse(input);
    // Then it cannot become a stored observation.
    expect(result.success).toBe(false);
  });

  it("requires an observer and retains Unicode notes", () => {
    // Given an otherwise valid local observation.
    const input = {
      id: "83f254b5-8a7b-4b71-9591-a7ff880f4ad7",
      siteId: "sample-garden",
      formVersion: "shell-v1",
      coordinates: [-76.485, 42.448],
      observer: "  JL ",
      people: 2,
      notes: "Café — 遊び",
      createdAt: "2026-09-17T10:00:00.000Z",
      storageStatus: "local-only",
    };
    // When parsing the record.
    const record = shellObservationSchema.parse(input);
    // Then identity is required and research text is preserved.
    expect(record.observer).toBe("JL");
    expect(record.notes).toBe(input.notes);
    expect(shellObservationSchema.safeParse({ ...input, observer: " " }).success).toBe(false);
  });
});

describe("Round context across the move to round types", () => {
  const legacy = {
    packageId: "riverside-play-study",
    packageVersion: "v4",
    zoneId: "B",
    zoneLabel: "Zone B · North playground",
    round: 2,
    freshPeriod: false,
    inheritedFrom: "",
  };

  it("reads a draft or record saved with a round number as a Standard round, keeping the number", () => {
    const parsed = roundContextSchema.parse(legacy);
    expect(parsed.roundType).toBe("standard");
    expect(parsed.round).toBe(2);
  });

  it("keeps the round type an observer chose", () => {
    const { round: _unused, ...rest } = legacy;
    expect(roundContextSchema.parse({ ...rest, roundType: "inventory" }).roundType).toBe(
      "inventory",
    );
    expect(roundContextSchema.safeParse({ ...rest, roundType: "weekly" }).success).toBe(false);
  });

  it("stores a whole-zone inventory as a zone placement, never as a hand-placed point", () => {
    expect(placementSchema.parse({ source: "zone", gpsAccuracyMetres: null }).source).toBe("zone");
    expect(placementSchema.safeParse({ source: "gps", gpsAccuracyMetres: 3 }).success).toBe(false);
  });
});
