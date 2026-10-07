import type { FormDefinition } from "./definition";
import { janetInventoryV1 } from "./fixtures/janet-inventory-v1";
import { janetTestV1 } from "./fixtures/janet-test-v1";
import { shellV1 } from "./fixtures/shell-v1";

/**
 * Versioned forms the collector can render offline. A version is uploadable only once the API
 * and the database carry a matching immutable form version; until then its records are held on
 * the device rather than queued against a contract the server would reject.
 */
const forms: readonly FormDefinition[] = [shellV1, janetTestV1, janetInventoryV1];

export type FormVersion = (typeof forms)[number]["version"];

export function formFor(version: string): FormDefinition | undefined {
  return forms.find((form) => form.version === version);
}

export function knownForms(): readonly FormDefinition[] {
  return forms;
}

/** `shell-v1` is the only version `backend/src/fieldmaps_api/schemas.py` accepts today. */
export function isUploadable(version: string): boolean {
  return formFor(version)?.status === "published";
}

/**
 * Answers carried into the next observation of a session: the observer code, wherever a form asks
 * for it (the question whose export column is `observer`). Every event answer starts empty again.
 */
export function carriedQuestionIds(form: FormDefinition): readonly string[] {
  return form.questions
    .filter((question) => question.exportColumn === "observer" && question.kind === "text")
    .map((question) => question.id);
}
