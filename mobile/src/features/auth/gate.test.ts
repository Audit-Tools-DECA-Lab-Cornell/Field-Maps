import { describe, expect, it, vi } from "vitest";

// The gate module also holds its hook; keep the native modules it reaches out of a Node test run.
vi.mock("expo-sqlite/kv-store", () => ({
  default: { getItemSync: () => null, setItemSync: () => undefined },
}));
vi.mock("../../auth/provider", () => ({ useAccount: () => ({}) }));
vi.mock("../preview/data-source", () => ({ PREVIEW_ALLOWED: true }));

const { decideGate } = await import("./gate");

const signedOutDevice = {
  configured: true,
  session: false,
  cachedAccount: false,
  profileComplete: false,
};

describe("decideGate", () => {
  it("lets a practice build straight in, with no sign-in and no onboarding", () => {
    expect(decideGate({ ...signedOutDevice, configured: false })).toEqual({
      signedIn: true,
      needsOnboarding: false,
      route: "app",
      overridden: false,
    });
  });

  it("sends a configured build with no session and no cached account to sign-in", () => {
    expect(decideGate(signedOutDevice)).toMatchObject({
      signedIn: false,
      needsOnboarding: false,
      route: "auth",
    });
  });

  it("keeps a cached account signed in offline, after its token expired", () => {
    expect(
      decideGate({ ...signedOutDevice, cachedAccount: true, profileComplete: true }),
    ).toMatchObject({ signedIn: true, route: "app" });
  });

  it("sends a session without a finished profile to onboarding", () => {
    expect(decideGate({ ...signedOutDevice, session: true, cachedAccount: true })).toMatchObject({
      signedIn: true,
      needsOnboarding: true,
      route: "onboarding",
    });
  });

  it("opens the app for a session with a finished profile", () => {
    expect(
      decideGate({ ...signedOutDevice, session: true, cachedAccount: true, profileComplete: true }),
    ).toMatchObject({ signedIn: true, needsOnboarding: false, route: "app" });
  });

  it.each([
    ["signed-out", "auth"],
    ["onboarding", "onboarding"],
    ["signed-in", "app"],
  ] as const)("lets the %s override win when overrides are allowed", (override, route) => {
    const real = { ...signedOutDevice, session: true, cachedAccount: true, profileComplete: true };
    expect(decideGate({ ...real, override, overrideAllowed: true })).toMatchObject({
      route,
      overridden: true,
    });
  });

  it("ignores an override in a release build", () => {
    expect(
      decideGate({ ...signedOutDevice, override: "signed-in", overrideAllowed: false }),
    ).toMatchObject({ route: "auth", overridden: false });
  });

  it("follows the account when the override is real", () => {
    expect(
      decideGate({ ...signedOutDevice, session: true, override: "real", overrideAllowed: true }),
    ).toMatchObject({ route: "onboarding", overridden: false });
  });
});
