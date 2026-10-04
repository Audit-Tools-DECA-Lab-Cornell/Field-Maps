import { afterEach, expect, it, vi } from "vitest";
import { createApiClient } from "./client";

const fetchMock = vi.fn<typeof fetch>();
afterEach(() => vi.unstubAllGlobals());
it.each([
  [401, "token_invalid", "sign-in"],
  [403, "account_deleted", "rejected"],
  [503, "storage_unavailable", "retry"],
])("maps %s into a typed %s error", async (status, code, kind) => {
  vi.stubGlobal(
    "fetch",
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code, message: "error", details: {} } }), {
        status: Number(status),
      }),
    ),
  );
  const client = createApiClient("https://api.example.test", async () => "current-token");
  await expect(client.me(new AbortController().signal)).rejects.toMatchObject({ code, kind });
  const request = fetchMock.mock.calls.at(-1)?.[0];
  expect(request).toBeInstanceOf(Request);
  if (request instanceof Request) {
    expect(request.url).toBe("https://api.example.test/v1/me");
    expect(request.headers.get("authorization")).toBe("Bearer current-token");
  }
});
it("refuses missing sessions before issuing a request", async () => {
  await expect(
    createApiClient("https://api.example.test", async () => null).me(new AbortController().signal),
  ).rejects.toMatchObject({ code: "unauthenticated" });
});
it("rejects malformed successes without trusting the response", async () => {
  vi.stubGlobal("fetch", fetchMock.mockResolvedValue(new Response("{}")));
  await expect(
    createApiClient("https://api.example.test", async () => "token").me(
      new AbortController().signal,
    ),
  ).rejects.toMatchObject({ code: "unknown", kind: "retry" });
});
