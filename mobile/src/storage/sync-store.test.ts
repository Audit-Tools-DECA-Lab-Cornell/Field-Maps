import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { shellObservationSchema } from "../domain/observation";
import {
  initializeDatabase,
  type LocalDatabase,
  listObservations,
  saveObservation,
} from "./observation-store";

function adapter(database: DatabaseSync): LocalDatabase {
  return {
    async execAsync(sql) {
      database.exec(sql);
    },
    async runAsync(sql, ...parameters) {
      return database.prepare(sql).run(...parameters);
    },
    async getAllAsync(sql, ...parameters) {
      return database.prepare(sql).all(...parameters);
    },
  };
}

const record = shellObservationSchema.parse({
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

describe("Account-scoped local work", () => {
  it("keeps existing practice records unassigned when upgrading", async () => {
    const sqlite = new DatabaseSync(":memory:");
    const db = adapter(sqlite);
    try {
      sqlite.exec(
        "CREATE TABLE observations(id TEXT PRIMARY KEY, created_at TEXT, payload TEXT); PRAGMA user_version=1;",
      );
      sqlite
        .prepare("INSERT INTO observations VALUES (?, ?, ?)")
        .run(record.id, record.createdAt, JSON.stringify(record));
      await initializeDatabase(db);
      expect(await listObservations(db, "account-a")).toEqual([]);
      expect(await listObservations(db)).toEqual([record]);
    } finally {
      sqlite.close();
    }
  });

  it("atomically queues a signed-in save and hides it from other accounts", async () => {
    const sqlite = new DatabaseSync(":memory:");
    const db = adapter(sqlite);
    try {
      await initializeDatabase(db);
      await saveObservation(db, record, "account-a");
      expect(await listObservations(db, "account-a")).toEqual([
        { ...record, storageStatus: "pending" },
      ]);
      expect(await listObservations(db, "account-b")).toEqual([]);
      expect(await listObservations(db)).toEqual([]);
    } finally {
      sqlite.close();
    }
  });
});
