import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { observationSchema } from "../domain/observation";
import {
  initializeDatabase,
  type LocalDatabase,
  listObservations,
  saveObservation,
} from "../storage/observation-store";
import { retryAttention } from "../storage/sync-store";
import { type Receipt, scopeKey, syncScopeSchema, type Upload } from "./contracts";
import { createSyncCoordinator } from "./coordinator";

const scope = syncScopeSchema.parse({
  apiUrl: "https://api.example.test",
  issuer: "https://auth.example.test",
  userId: "50000000-0000-4000-8000-000000000001",
  projectId: "10000000-0000-4000-8000-000000000002",
});
const record = observationSchema.parse({
  id: "83f254b5-8a7b-4b71-9591-a7ff880f4ad7",
  siteId: "sample-garden",
  formVersion: "shell-v1",
  coordinates: [-76.485, 42.448],
  observer: "QA",
  people: 3,
  notes: "Offline",
  createdAt: "2026-09-17T12:00:00.000Z",
  storageStatus: "local-only",
});
const receipt: Receipt = {
  observation_id: record.id,
  user_id: scope.userId,
  project_id: scope.projectId,
  accepted_revision: 1,
  received_at: "2026-09-17T13:00:00Z",
};
const key = scopeKey(scope);
let sqlite: DatabaseSync;
let database: LocalDatabase;
let directory: string;
let filename: string;

function open() {
  sqlite = new DatabaseSync(filename);
  database = {
    async execAsync(sql) {
      sqlite.exec(sql);
    },
    async runAsync(sql, ...parameters) {
      return sqlite.prepare(sql).run(...parameters);
    },
    async getAllAsync(sql, ...parameters) {
      return sqlite.prepare(sql).all(...parameters);
    },
  };
}
beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), "fieldops-sync-"));
  filename = join(directory, "records.db");
  open();
  await initializeDatabase(database);
  await saveObservation(database, record, key);
});
afterEach(() => {
  sqlite.close();
  rmSync(directory, { recursive: true });
});

describe("Durable synchronization", () => {
  it("preserves a failed upload and its backoff across restart, then stores a verified receipt", async () => {
    let now = 1000;
    let calls = 0;
    const upload: Upload = async () => {
      calls += 1;
      return calls === 1 ? { kind: "retry", message: "Offline" } : { kind: "accepted", receipt };
    };
    const options = () => ({
      database,
      scope,
      isCurrent: () => true,
      getToken: async () => "token",
      upload,
      now: () => now,
    });
    await createSyncCoordinator(options())(new AbortController().signal);
    sqlite.close();
    open();
    await initializeDatabase(database);
    expect((await listObservations(database, key))[0]?.storageStatus).toBe("pending");
    const resumed = createSyncCoordinator(options());
    await resumed(new AbortController().signal);
    expect(calls).toBe(1);
    now = 6000;
    await resumed(new AbortController().signal);
    expect(calls).toBe(2);
    expect((await listObservations(database, key))[0]?.storageStatus).toBe("synced");
    expect(
      z
        .object({ server_receipt: z.string() })
        .parse(sqlite.prepare("SELECT server_receipt FROM observations").get()).server_receipt,
    ).toBe(JSON.stringify(receipt));
    await resumed(new AbortController().signal);
    expect(calls).toBe(2);
  });

  it("ignores a late response after changing account and prevents overlapping drains", async () => {
    let current = true;
    let calls = 0;
    const started = Promise.withResolvers<void>();
    const response = Promise.withResolvers<Awaited<ReturnType<Upload>>>();
    const drain = createSyncCoordinator({
      database,
      scope,
      isCurrent: () => current,
      getToken: async () => "token",
      upload: async () => {
        calls += 1;
        started.resolve();
        return response.promise;
      },
    });
    const pending = drain(new AbortController().signal);
    await started.promise;
    await drain(new AbortController().signal);
    current = false;
    response.resolve({ kind: "accepted", receipt });
    await pending;
    expect(calls).toBe(1);
    expect((await listObservations(database, key))[0]?.storageStatus).toBe("pending");
  });

  it("does not send before account readiness or without a session token", async () => {
    let calls = 0;
    const upload: Upload = async () => {
      calls += 1;
      return { kind: "accepted", receipt };
    };
    await createSyncCoordinator({
      database,
      scope,
      isCurrent: () => false,
      getToken: async () => "token",
      upload,
    })(new AbortController().signal);
    await createSyncCoordinator({
      database,
      scope,
      isCurrent: () => true,
      getToken: async () => null,
      upload,
    })(new AbortController().signal);
    expect(calls).toBe(0);
  });

  it("preserves rejected records and only retries them after an explicit retry", async () => {
    let calls = 0;
    const drain = createSyncCoordinator({
      database,
      scope,
      isCurrent: () => true,
      getToken: async () => "token",
      upload: async () => {
        calls += 1;
        return { kind: "rejected", message: "No project access" };
      },
    });
    await drain(new AbortController().signal);
    expect((await listObservations(database, key))[0]?.storageStatus).toBe("needs-attention");
    await drain(new AbortController().signal);
    expect(calls).toBe(1);
    await retryAttention(database, "another-account");
    await drain(new AbortController().signal);
    expect(calls).toBe(1);
    await retryAttention(database, key);
    await drain(new AbortController().signal);
    expect(calls).toBe(2);
  });
});
