import definition from "../../../../contracts/forms/janet-test-v1.json";
import { parseFormDefinition } from "../definition";

export const janetTestV1 = parseFormDefinition(definition);

/** Answers carried into the next observation in the same session. */
export const carriedAnswers: readonly string[] = ["observer_initials"];
