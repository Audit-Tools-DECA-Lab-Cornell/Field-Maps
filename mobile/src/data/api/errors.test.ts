import { expect, it } from "vitest";
import { ApiError, errorCopy, parseApiError, readApiError } from "./errors";

it.each(Object.entries(errorCopy))("maps %s to safe field copy", (code, message) => {
  const error = parseApiError(400, {
    error: { code, message: "private server text", details: {} },
  });
  expect(error).toBeInstanceOf(ApiError);
  expect(error.code).toBe(code);
  expect(error.message).toBe(message);
  expect(error.message).not.toContain("private");
});
it.each([
  ["conflict", "rejected"],
  ["validation_failed", "rejected"],
  ["rate_limited", "retry"],
  ["token_invalid", "sign-in"],
])("classifies %s by code", (code, kind) => {
  expect(parseApiError(400, { error: { code, message: "ignored", details: {} } }).kind).toBe(kind);
});
it.each([
  null,
  [],
  { detail: "legacy" },
  { error: { code: "future_code", message: "secret", details: {} } },
])("preserves records when the response is unrecognized", (body) => {
  const error = parseApiError(400, body);
  expect(error.code).toBe("unknown");
  expect(error.kind).toBe("retry");
  expect(error.message).toContain("saved");
});
it("handles non-JSON failures without exposing response text", async () => {
  const error = await readApiError(
    new Response("<html>secret proxy details</html>", { status: 400 }),
  );
  expect(error.kind).toBe("retry");
  expect(error.message).not.toContain("secret");
  expect((await readApiError(new Response("", { status: 401 }))).kind).toBe("sign-in");
  expect((await readApiError(new Response("", { status: 503 }))).kind).toBe("retry");
});
