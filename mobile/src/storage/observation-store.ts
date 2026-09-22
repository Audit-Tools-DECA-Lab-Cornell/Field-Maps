import { z } from "zod";
import { type Observation, observationSchema, storageStatusSchema } from "../domain/observation";
import { isUploadable } from "../forms/registry";

export interface LocalDatabase {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...parameters: (string | number)[]): Promise<unknown>;
  getAllAsync(sql: string, ...parameters: (string | number)[]): Promise<unknown[]>;
}

class NewerDatabaseError extends Error {
  constructor(readonly version: number) {
    super("This database belongs to a newer app. Update FieldOps to open it.");
    this.name = "NewerDatabaseError";
  }
}

export const SCHEMA_VERSION = 3;

export async function initializeDatabase(db: LocalDatabase): Promise<void> {
  const versions = z
    .array(z.object({ user_version: z.number().int() }))
    .parse(await db.getAllAsync("PRAGMA user_version"));
  const version = versions[0]?.user_version ?? 0;
  if (version > SCHEMA_VERSION) throw new NewerDatabaseError(version);
  await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  if (version === 0) {
    try {
      await db.execAsync(`
        BEGIN IMMEDIATE;
        CREATE TABLE observations (
          id TEXT PRIMARY KEY NOT NULL,
          created_at TEXT NOT NULL,
          payload TEXT NOT NULL
        );
        CREATE INDEX observations_created_at ON observations(created_at DESC);
        PRAGMA user_version = 1;
        COMMIT;
      `);
    } catch (error) {
      await db.execAsync("ROLLBACK;");
      throw error;
    }
  }
  if (version < 2) {
    try {
      await db.execAsync(`
        BEGIN IMMEDIATE;
        ALTER TABLE observations ADD COLUMN owner_scope TEXT NOT NULL DEFAULT 'local';
        ALTER TABLE observations ADD COLUMN sync_state TEXT NOT NULL DEFAULT 'local-only'
          CHECK (sync_state IN ('local-only', 'pending', 'synced', 'needs-attention'));
        ALTER TABLE observations ADD COLUMN sync_error TEXT NOT NULL DEFAULT '';
        ALTER TABLE observations ADD COLUMN server_receipt TEXT NOT NULL DEFAULT '';
        ALTER TABLE observations ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE observations ADD COLUMN next_attempt_at INTEGER NOT NULL DEFAULT 0;
        CREATE INDEX observations_pending ON observations(owner_scope, sync_state, next_attempt_at);
        PRAGMA user_version = 2;
        COMMIT;
      `);
    } catch (error) {
      await db.execAsync("ROLLBACK;");
      throw error;
    }
  }
  if (version < 3) {
    // An unfinished observation is not an uploadable record. It lives in its own table so a
    // half-answered form can never reach the upload queue, and so an interrupted observation
    // survives a force quit.
    try {
      await db.execAsync(`
        BEGIN IMMEDIATE;
        CREATE TABLE observation_drafts (
          owner_scope TEXT PRIMARY KEY NOT NULL,
          id TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          payload TEXT NOT NULL
        );
        PRAGMA user_version = 3;
        COMMIT;
      `);
    } catch (error) {
      await db.execAsync("ROLLBACK;");
      throw error;
    }
  }
}

/**
 * A record is queued for upload only when it belongs to an account and its form version is one
 * the API accepts. A draft form version stays `local-only`, so nothing is sent against a
 * contract the server would reject and nothing is silently lost.
 */
export function initialSyncState(record: Observation, scope: string) {
  return scope === "local" || !isUploadable(record.formVersion) ? "local-only" : "pending";
}

export async function saveObservation(
  db: LocalDatabase,
  record: Observation,
  scope = "local",
): Promise<void> {
  await db.runAsync(
    "INSERT INTO observations (id, created_at, payload, owner_scope, sync_state) VALUES (?, ?, ?, ?, ?)",
    record.id,
    record.createdAt,
    JSON.stringify(record),
    scope,
    initialSyncState(record, scope),
  );
}

export async function listObservations(db: LocalDatabase, scope = "local"): Promise<Observation[]> {
  const rows = z
    .array(
      z.object({
        payload: z.string(),
        sync_state: storageStatusSchema,
        sync_error: z.string(),
      }),
    )
    .parse(
      await db.getAllAsync(
        "SELECT payload, sync_state, sync_error FROM observations WHERE owner_scope = ? ORDER BY created_at DESC, id DESC",
        scope,
      ),
    );
  return rows.map((row) => ({
    ...observationSchema.parse(JSON.parse(row.payload)),
    storageStatus: row.sync_state,
    syncError: row.sync_error,
  }));
}
