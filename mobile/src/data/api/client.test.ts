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

const profile = {
  user_id: "50000000-0000-4000-8000-000000000001",
  display_name: "Pratyush Sudhakar",
  observer_initials: "PS",
  locale: null,
  created_at: "2026-10-04T00:00:00Z",
};

type Sent = { method: string; url: string; body: unknown; auth: string | null };
let last: Sent | null = null;

/** Answers every request with `body`, keeping what was sent (read as it arrives, before ky is done). */
function answer(body: unknown): void {
  vi.stubGlobal(
    "fetch",
    fetchMock.mockImplementation(async (input) => {
      if (!(input instanceof Request)) throw new Error("expected a Request");
      last = {
        method: input.method,
        url: input.url,
        body: JSON.parse(await input.clone().text()),
        auth: input.headers.get("authorization"),
      };
      return new Response(JSON.stringify(body));
    }),
  );
}

it("patches the profile with the display name and initials, and checks what comes back", async () => {
  answer(profile);
  const client = createApiClient("https://api.example.test", async () => "token");
  const patch = { display_name: "Pratyush Sudhakar", observer_initials: "PS" };
  await expect(client.updateProfile(patch, new AbortController().signal)).resolves.toEqual(profile);
  expect(last).toEqual({
    method: "PATCH",
    url: "https://api.example.test/v1/me",
    body: patch,
    auth: "Bearer token",
  });
});

it("previews and redeems a join code with the code in the body", async () => {
  const client = createApiClient("https://api.example.test", async () => "token");
  const preview = {
    organization_name: "DECA Lab",
    project_name: "Play Study",
    role: "observer",
    expires_at: "2026-10-11T18:00:00Z",
  };
  answer(preview);
  await expect(client.previewInvitation("DECA2026", new AbortController().signal)).resolves.toEqual(
    preview,
  );
  expect(last).toMatchObject({
    method: "POST",
    url: "https://api.example.test/v1/invitations/preview",
    body: { code: "DECA2026" },
  });

  const redeemed = {
    organization_id: "20000000-0000-4000-8000-000000000001",
    project_id: "10000000-0000-4000-8000-000000000003",
    role: "observer",
  };
  answer(redeemed);
  await expect(client.redeemInvitation("DECA2026", new AbortController().signal)).resolves.toEqual(
    redeemed,
  );
  expect(last).toMatchObject({
    method: "POST",
    url: "https://api.example.test/v1/invitations/redeem",
    body: { code: "DECA2026" },
  });
});

it("refuses an invitation preview whose role it does not know", async () => {
  vi.stubGlobal(
    "fetch",
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          organization_name: "DECA Lab",
          project_name: null,
          role: "superuser",
          expires_at: "2026-10-11T18:00:00Z",
        }),
      ),
    ),
  );
  await expect(
    createApiClient("https://api.example.test", async () => "token").previewInvitation(
      "DECA2026",
      new AbortController().signal,
    ),
  ).rejects.toMatchObject({ code: "unknown", kind: "retry" });
});

it.each([
  [404, "invitation_invalid", null],
  [410, "invitation_expired", null],
  [429, "rate_limited", 120],
])("carries a %s %s from the join code calls", async (status, code, retryAfter) => {
  vi.stubGlobal(
    "fetch",
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code, message: "error", details: {} } }), {
        status,
        headers: retryAfter === null ? {} : { "Retry-After": String(retryAfter) },
      }),
    ),
  );
  await expect(
    createApiClient("https://api.example.test", async () => "token").redeemInvitation(
      "DECA2026",
      new AbortController().signal,
    ),
  ).rejects.toMatchObject({ code, retryAfter });
});

it("reads a dropped connection as a retry, not a refusal", async () => {
  vi.stubGlobal("fetch", fetchMock.mockRejectedValue(new TypeError("Network request failed")));
  await expect(
    createApiClient("https://api.example.test", async () => "token").updateProfile(
      { observer_initials: "PS" },
      new AbortController().signal,
    ),
  ).rejects.toMatchObject({ code: "unknown", kind: "retry" });
});
