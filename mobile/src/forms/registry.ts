import type { FormDefinition } from "./definition";
import { janetTestV1 } from "./fixtures/janet-test-v1";
import { shellV1 } from "./fixtures/shell-v1";

/**
 * Versioned forms the collector can render offline. A version is uploadable only once the API
 * and the database carry a matching immutable form version; until then its records are held on
 * the device rather than queued against a contract the server would reject.
 */
const forms: readonly FormDefinition[] = [shellV1, janetTestV1];

export type FormVersion = (typeof forms)[number]["version"];

export function formFor(version: string): FormDefinition | undefined {
  return forms.find((form) => form.version === version);
}

export function knownForms(): readonly FormDefinition[] {
  return forms;
}

/** `shell-v1` is the only version `backend/src/fieldops_api/schemas.py` accepts today. */
export function isUploadable(version: string): boolean {
  return formFor(version)?.status === "published";
}
