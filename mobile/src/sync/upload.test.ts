import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  instrumentObservationSchema,
  type Observation,
  shellObservationSchema,
} from "../domain/observation";
import { receiptSchema, syncScopeSchema } from "./contracts";
import { uploadObservation } from "./upload";

let server: Server;
let baseUrl = "";
let status = 200;
let response: unknown;
let requestBody = "";
let authorization: string | undefined;
let path = "";
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
const receipt = receiptSchema.parse({
  observation_id: record.id,
  user_id: "50000000-0000-4000-8000-000000000001",
  project_id: "10000000-0000-4000-8000-000000000002",
  accepted_revision: 1,
  received_at: "2026-09-17T13:00:00+00:00",
});
beforeEach(async () => {
  path = "";
  status = 200;
  response = receipt;
  requestBody = "";
  server = createServer((request, result) => {
    authorization = request.headers.authorization;
    path = request.url ?? "";
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      requestBody += chunk;
    });
    request.on("end", () => {
      result.writeHead(status, { "Content-Type": "application/json" });
      result.end(JSON.stringify(response));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected HTTP port");
  baseUrl = `http://127.0.0.1:${address.port}`;
});
afterEach(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});
function upload(sent: Observation = record) {
  return uploadObservation(
    syncScopeSchema.parse({
      apiUrl: "http://127.0.0.1:8000",
      issuer: "https://auth.example.test",
      projectId: "90000000-0000-4000-8000-000000000009",
      userId: receipt.user_id,
    }),
    baseUrl,
    sent,
    "session-token",
    new AbortController().signal,
  );
}

const STUDY = "a0000000-0000-4000-8000-0000000000aa";
const instrument = instrumentObservationSchema.parse({
  id: "93f254b5-8a7b-4b71-9591-a7ff880f4ad7",
  projectId: STUDY,
  siteId: "fall-creek",
  formVersion: "play-v1",
  coordinates: [-76.495, 42.445],
  observer: "JL",
  answers: { age_range: "age_3_5", observer_initials: "JL", play_event_summary: "Digging." },
  context: {
    packageId: "p",
    packageVersion: "v2",
    zoneId: "A",
    zoneLabel: "Zone A",
    roundType: "reliability",
    freshPeriod: true,
    inheritedFrom: "",
  },
  placement: { source: "hand", gpsAccuracyMetres: null },
  createdAt: "2026-10-08T14:00:00.000Z",
  storageStatus: "pending",
});
it("sends the authenticated wire contract and verifies the server receipt", async () => {
  expect(await upload()).toEqual({ kind: "accepted", receipt });
  expect(path).toBe(`/v1/projects/${receipt.project_id}/observations/${record.id}`);
  expect(authorization).toBe("Bearer session-token");
  expect(JSON.parse(requestBody)).toEqual({
    site_id: "sample-garden",
    form_version: "shell-v1",
    coordinates: [-76.485, 42.448],
    observer: "QA",
    people: 3,
    notes: "Offline",
    observed_at: record.createdAt,
  });
});
it.each([
  "observation_id",
  "user_id",
  "project_id",
])("rejects a receipt with a different %s", async (field) => {
  response = { ...receipt, [field]: "90000000-0000-4000-8000-000000000009" };
  expect((await upload()).kind).toBe("rejected");
});
it.each([
  [401, "token_invalid", "sign-in"],
  [403, "role_required", "rejected"],
  [409, "conflict", "rejected"],
  [422, "validation_failed", "rejected"],
  [429, "rate_limited", "retry"],
  [503, "storage_unavailable", "retry"],
])("classifies HTTP %s with %s as %s", async (statusCode, code, kind) => {
  status = Number(statusCode);
  response = { error: { code, message: "Failure", details: {} } };
  expect((await upload()).kind).toBe(kind);
});
it.each([
  408, 429, 403, 409, 422,
])("preserves records for legacy HTTP %s failures", async (code) => {
  status = code;
  response = { detail: "Failure" };
  expect((await upload()).kind).toBe("retry");
});
it("keeps a malformed successful response retryable", async () => {
  response = { success: true };
  expect((await upload()).kind).toBe("retry");
});
it("keeps a record retryable when the connection drops, as React Native's fetch reports it", async () => {
  // ky wraps this TypeError in its own NetworkError, which is not a TypeError.
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network request failed")));
  try {
    expect(await upload()).toMatchObject({ kind: "retry" });
  } finally {
    vi.unstubAllGlobals();
  }
});

it("sends a study record to its own project, with its round and every answer beside it", async () => {
  response = { ...receipt, observation_id: instrument.id, project_id: STUDY };
  expect((await upload(instrument)).kind).toBe("accepted");
  expect(path).toBe(`/v1/projects/${STUDY}/observations/${instrument.id}`);
  expect(JSON.parse(requestBody)).toEqual({
    site_id: "fall-creek",
    form_version: "play-v1",
    coordinates: [-76.495, 42.445],
    observer: "JL",
    observed_at: instrument.createdAt,
    zone: "A",
    round_type: "reliability",
    first_round: true,
    placement: "hand",
    age_range: "age_3_5",
    observer_initials: "JL",
    play_event_summary: "Digging.",
  });
});

it("sends no first-round answer for a zone inventory", async () => {
  const inventory = instrumentObservationSchema.parse({
    ...instrument,
    context: { ...instrument.context, roundType: "inventory" },
    placement: { source: "zone", gpsAccuracyMetres: null },
  });
  response = { ...receipt, observation_id: inventory.id, project_id: STUDY };
  await upload(inventory);
  const body = JSON.parse(requestBody);
  expect(body.round_type).toBe("inventory");
  expect(body.placement).toBe("zone");
  expect("first_round" in body).toBe(false);
});

it("refuses to send a study record that names no project", async () => {
  const { projectId: _none, ...bundled } = instrument;
  expect((await upload(instrumentObservationSchema.parse(bundled))).kind).toBe("rejected");
  expect(path).toBe("");
});
