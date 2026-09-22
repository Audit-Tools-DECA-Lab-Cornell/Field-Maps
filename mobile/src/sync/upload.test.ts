import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, expect, it } from "vitest";
import { shellObservationSchema } from "../domain/observation";
import { receiptSchema, syncScopeSchema } from "./contracts";
import { uploadObservation } from "./upload";

let server: Server;
let baseUrl = "";
let status = 200;
let response: unknown;
let requestBody = "";
let authorization: string | undefined;
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
  status = 200;
  response = receipt;
  requestBody = "";
  server = createServer((request, result) => {
    authorization = request.headers.authorization;
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
function upload() {
  return uploadObservation(
    syncScopeSchema.parse({
      apiUrl: baseUrl,
      issuer: "https://auth.example.test",
      projectId: receipt.project_id,
      userId: receipt.user_id,
    }),
    record,
    "session-token",
    new AbortController().signal,
  );
}
it("sends the authenticated wire contract and verifies the server receipt", async () => {
  expect(await upload()).toEqual({ kind: "accepted", receipt });
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
  [401, "sign-in"],
  [403, "rejected"],
  [409, "rejected"],
  [422, "rejected"],
  [429, "retry"],
  [503, "retry"],
])("classifies HTTP %s as %s", async (code, kind) => {
  status = Number(code);
  response = { detail: "Failure" };
  expect((await upload()).kind).toBe(kind);
});
it("keeps a malformed successful response retryable", async () => {
  response = { success: true };
  expect((await upload()).kind).toBe("retry");
});
