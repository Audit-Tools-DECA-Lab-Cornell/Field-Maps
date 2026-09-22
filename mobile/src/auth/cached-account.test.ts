import { expect, it } from "vitest";
import { cachedAccount } from "./cached-account";

it("retains only the local account identity even when an access token has expired", () => {
  const user = { id: "50000000-0000-4000-8000-000000000001", email: "qa@example.test" };
  expect(
    cachedAccount(JSON.stringify({ user, access_token: "expired-test-token", expires_at: 1 })),
  ).toEqual(user);
});

it.each([
  null,
  "broken",
  "{}",
  '{"user":{"id":"invalid"}}',
])("ignores missing or invalid cached identity: %s", (value) => {
  expect(cachedAccount(value)).toBeNull();
});
