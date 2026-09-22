import { describe, expect, it } from "vitest";
import { parseFormDefinition, validateFormDefinition } from "./definition";
import { janetTestV1 } from "./fixtures/janet-test-v1";
import { shellV1 } from "./fixtures/shell-v1";

function form(questions: readonly unknown[], extra: Record<string, unknown> = {}) {
  return {
    version: "test",
    title: "Test",
    summary: "A test definition.",
    source: "test",
    status: "draft",
    inclusion: "test",
    questions,
    ...extra,
  };
}

const choice = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  code: id,
  exportColumn: "",
  act: "Play",
  label: id,
  kind: "one",
  source: "test",
  options: [
    { code: "yes", label: "Yes" },
    { code: "no", label: "No" },
  ],
  ...extra,
});

describe("Form definition validation", () => {
  it("accepts the shipped fixtures, so a broken instrument cannot reach the field", () => {
    // Given the definitions the collector renders.
    // When they are parsed at module load.
    // Then both are structurally sound.
    expect(validateFormDefinition(shellV1)).toEqual([]);
    expect(validateFormDefinition(janetTestV1)).toEqual([]);
    expect(janetTestV1.questions.map((question) => question.id)).toContain("wildlife_interaction");
  });

  it("refuses two questions claiming the same export column", () => {
    // Given two fields that would land in one analysis column.
    const definition = form([
      choice("first", { exportColumn: "Nat_LP_Intn_Binary" }),
      choice("second", { exportColumn: "Nat_LP_Intn_Binary" }),
    ]);
    // When the definition is parsed.
    // Then it is rejected rather than silently overwriting one answer with the other.
    expect(() => parseFormDefinition(definition)).toThrow(/claimed by both/);
  });

  it("allows a collision that was recorded as a known source defect", () => {
    // Given the same collision, explicitly listed as an unresolved workbook issue.
    const definition = form(
      [
        choice("first", { exportColumn: "Nat_LP_Intn_Binary" }),
        choice("second", { exportColumn: "Nat_LP_Intn_Binary" }),
      ],
      { knownExportCollisions: ["Nat_LP_Intn_Binary"] },
    );
    // When it is parsed.
    // Then it loads, because the gap is carried deliberately rather than by accident.
    expect(parseFormDefinition(definition).questions).toHaveLength(2);
  });

  it("refuses a condition that points at a question which does not exist", () => {
    // Given a rule referencing a field that was excluded, as H169 does.
    const definition = form([
      choice("kept", {
        dependsOn: { kind: "equals", question: "loose_parts_14", option: "yes" },
      }),
    ]);
    // When the definition is parsed.
    // Then the dangling reference is named instead of quietly never matching.
    expect(() => parseFormDefinition(definition)).toThrow(/unknown question "loose_parts_14"/);
  });

  it("refuses a dependency cycle and a backwards dependency", () => {
    // Given two questions that reveal each other.
    const cyclic = form([
      choice("a", { dependsOn: { kind: "answered", question: "b" } }),
      choice("b", { dependsOn: { kind: "answered", question: "a" } }),
    ]);
    // When each definition is parsed.
    // Then neither can be used, because a revealed question must follow its parent.
    expect(() => parseFormDefinition(cyclic)).toThrow(/cycle|authored after/);
  });

  it("refuses a question that is required but has no supplied option list", () => {
    // Given a field whose workbook list is still "to be provided".
    const definition = form([
      choice("pending", {
        options: [],
        required: true,
        optionsPending: "The workbook does not supply this list.",
      }),
    ]);
    // When it is parsed.
    // Then it is rejected: an unanswerable question must never block a save.
    expect(() => parseFormDefinition(definition)).toThrow(/required but its option list/);
  });

  it("refuses a dynamic option set keyed by an answer its parent cannot give", () => {
    // Given a subtype set for a play type that is not in the parent's options.
    const definition = form([
      choice("parent"),
      choice("child", {
        options: [],
        dependsOn: { kind: "answered", question: "parent" },
        dynamicFrom: {
          question: "parent",
          sets: {
            maybe: {
              code: "Maybe_Subtype",
              exportColumn: "Maybe_Subtype",
              label: "Which kind?",
              options: [{ code: "one", label: "One" }],
            },
          },
        },
      }),
    ]);
    // When it is parsed.
    // Then the unreachable set is reported.
    expect(() => parseFormDefinition(definition)).toThrow(/cannot answer/);
  });
});
