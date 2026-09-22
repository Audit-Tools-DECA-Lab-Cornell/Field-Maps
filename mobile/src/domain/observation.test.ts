import { describe, expect, it } from "vitest";
import { coordinateSchema, countInputSchema, shellObservationSchema } from "./observation";

describe("Observation boundaries", () => {
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
