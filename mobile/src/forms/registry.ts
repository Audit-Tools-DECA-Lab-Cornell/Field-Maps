import { isShellObservation, type Observation } from "../domain/observation";
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

/** Whether a form the app carries is published, so the API accepts records made with it. */
export function isUploadable(version: string): boolean {
  return formFor(version)?.status === "published";
}

/**
 * Whether a record can be queued for upload. A practice record goes to the practice project. An
 * instrument record goes to the project it names, which published its form; one made on a site that
 * ships with the app names none, and stays on the device rather than being sent where no one expects it.
 */
export function isUploadableRecord(record: Observation): boolean {
  return isShellObservation(record)
    ? isUploadable(record.formVersion)
    : record.projectId !== undefined;
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
