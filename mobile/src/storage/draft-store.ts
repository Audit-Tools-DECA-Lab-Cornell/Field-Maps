import { z } from "zod";
import {
  answerValueSchema,
  coordinateSchema,
  placementSchema,
  roundContextSchema,
} from "../domain/observation";
import type { LocalDatabase } from "./observation-store";

/**
 * An observation in progress. Every answer is written here as it is tapped, so a force quit
 * costs nothing. Drafts are account-scoped and deliberately separate from the upload queue:
 * an incomplete form is not a record and must never reach the server.
 */
export const observationDraftSchema = z.object({
  id: z.uuid(),
  formVersion: z.string().min(1),
  packageId: z.string().min(1),
  siteId: z.string().min(1),
  context: roundContextSchema,
  coordinates: coordinateSchema.nullable(),
  placement: placementSchema.nullable(),
  answers: z.record(z.string(), answerValueSchema),
  questionIndex: z.number().int().min(0),
  startedAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type ObservationDraft = Readonly<z.infer<typeof observationDraftSchema>>;

export async function saveDraft(
  db: LocalDatabase,
  scope: string,
  draft: ObservationDraft,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO observation_drafts (owner_scope, id, updated_at, payload) VALUES (?, ?, ?, ?)
       ON CONFLICT(owner_scope) DO UPDATE SET
         id = excluded.id, updated_at = excluded.updated_at, payload = excluded.payload`,
    scope,
    draft.id,
    draft.updatedAt,
    JSON.stringify(draft),
  );
}

export async function readDraft(
  db: LocalDatabase,
  scope: string,
): Promise<ObservationDraft | null> {
  const rows = z
    .array(z.object({ payload: z.string() }))
    .parse(
      await db.getAllAsync(
        "SELECT payload FROM observation_drafts WHERE owner_scope = ? LIMIT 1",
        scope,
      ),
    );
  const row = rows[0];
  if (!row) return null;
  const parsed = observationDraftSchema.safeParse(JSON.parse(row.payload));
  // A draft written by a version this app no longer understands is dropped rather than
  // offered for resume, which would restore answers against the wrong question stack.
  if (!parsed.success) {
    await clearDraft(db, scope);
    return null;
  }
  return parsed.data;
}

export async function clearDraft(db: LocalDatabase, scope: string): Promise<void> {
  await db.runAsync("DELETE FROM observation_drafts WHERE owner_scope = ?", scope);
}

/** How much of the draft is worth offering back, for the recovery prompt's own sentence. */
export function draftSummary(draft: ObservationDraft): string {
  const answers = Object.keys(draft.answers).length;
  const where = draft.coordinates
    ? `A point at ${draft.coordinates[1].toFixed(4)}, ${draft.coordinates[0].toFixed(4)}`
    : "An observation with no point yet";
  const counted = `${answers} ${answers === 1 ? "answer" : "answers"}`;
  return `${where} with ${counted} was never saved. Answers are written to storage as you tap, so nothing waits on a save.`;
}
