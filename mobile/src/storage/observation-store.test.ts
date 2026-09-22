import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { observationSchema } from "../domain/observation";
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

const record = observationSchema.parse({
  id: "83f254b5-8a7b-4b71-9591-a7ff880f4ad7",
  siteId: "sample-garden",
  formVersion: "shell-v1",
  coordinates: [-76.485, 42.448],
  observer: "JL",
  people: 2,
  notes: "Child's play — café",
  createdAt: "2026-09-17T10:00:00.000Z",
  storageStatus: "local-only",
});

describe("Local observation persistence", () => {
  it("restores the observation after closing and reopening a real SQLite file", async () => {
    // Given a saved observation in an on-disk database.
    const directory = mkdtempSync(join(tmpdir(), "fieldops-db-"));
    const filename = join(directory, "observations.db");
    let database = new DatabaseSync(filename);
    try {
      await initializeDatabase(adapter(database));
      await saveObservation(adapter(database), record);
      database.close();
      // When the database is opened by a fresh connection.
      database = new DatabaseSync(filename);
      await initializeDatabase(adapter(database));
      const records = await listObservations(adapter(database));
      // Then all fields, including coordinates and local-only status, survive.
      expect(records).toEqual([record]);
    } finally {
      database.close();
      rmSync(directory, { recursive: true });
    }
  });

  it("does not silently replace an observation with the same ID", async () => {
    // Given a stored record.
    const database = new DatabaseSync(":memory:");
    try {
      await initializeDatabase(adapter(database));
      await saveObservation(adapter(database), record);
      // When a duplicate ID is saved.
      const secondSave = saveObservation(adapter(database), { ...record, notes: "replacement" });
      // Then it fails and leaves the original intact.
      await expect(secondSave).rejects.toThrow();
      expect(await listObservations(adapter(database))).toEqual([record]);
    } finally {
      database.close();
    }
  });

  it("refuses a newer database schema without modifying its records", async () => {
    // Given a database written by a newer app.
    const database = new DatabaseSync(":memory:");
    try {
      database.exec("PRAGMA user_version = 99;");
      // When this app attempts to initialize it.
      const initialization = initializeDatabase(adapter(database));
      // Then it fails instead of downgrading the database.
      await expect(initialization).rejects.toThrow(/newer/i);
    } finally {
      database.close();
    }
  });
});
