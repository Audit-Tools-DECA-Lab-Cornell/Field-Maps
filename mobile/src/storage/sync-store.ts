import { z } from "zod";
import { observationSchema, type ShellObservation } from "../domain/observation";
import { isUploadable } from "../forms/registry";
import type { Receipt } from "../sync/contracts";
import type { LocalDatabase } from "./observation-store";

/**
 * Records ready for another upload attempt. Only a form version the API accepts can be queued,
 * and the filter is repeated here so a version that stops being accepted is never sent against
 * a contract that would reject it.
 */
export async function pendingObservations(db: LocalDatabase, scope: string, now: number) {
  const rows = z
    .array(z.object({ payload: z.string(), attempts: z.number().int() }))
    .parse(
      await db.getAllAsync(
        "SELECT payload, attempts FROM observations WHERE owner_scope = ? AND sync_state = 'pending' AND next_attempt_at <= ? ORDER BY created_at, id LIMIT 25",
        scope,
        now,
      ),
    );
  return rows
    .map((row) => ({
      record: observationSchema.parse(JSON.parse(row.payload)),
      attempts: row.attempts,
    }))
    .filter(
      (item): item is { record: ShellObservation; attempts: number } =>
        item.record.formVersion === "shell-v1" && isUploadable(item.record.formVersion),
    );
}

export async function acknowledge(
  db: LocalDatabase,
  scope: string,
  receipt: Receipt,
): Promise<void> {
  await db.runAsync(
    "UPDATE observations SET sync_state = 'synced', sync_error = '', server_receipt = ? WHERE id = ? AND owner_scope = ? AND sync_state = 'pending'",
    JSON.stringify(receipt),
    receipt.observation_id,
    scope,
  );
}

export async function deferObservation(
  db: LocalDatabase,
  scope: string,
  id: string,
  message: string,
  nextAttempt: number,
  rejected: boolean,
): Promise<void> {
  await db.runAsync(
    "UPDATE observations SET sync_state = ?, sync_error = ?, attempts = attempts + 1, next_attempt_at = ? WHERE id = ? AND owner_scope = ? AND sync_state = 'pending'",
    rejected ? "needs-attention" : "pending",
    message,
    nextAttempt,
    id,
    scope,
  );
}

export async function retryAttention(db: LocalDatabase, scope: string): Promise<void> {
  await db.runAsync(
    "UPDATE observations SET sync_state = 'pending', sync_error = '', next_attempt_at = 0 WHERE owner_scope = ? AND sync_state IN ('pending', 'needs-attention')",
    scope,
  );
}
