import { describe, expect, it } from "vitest";
import { pointInPolygon, RIVERSIDE_PLAN, WELCOME_MARKERS, WELCOME_VIEW } from "./plan";
import {
  confirmCheck,
  formatCountdown,
  isEmail,
  lengthCheck,
  resetDisabledReason,
  SIGN_IN_MESSAGES,
  signInFailure,
  stayingTitle,
  waitingTitle,
} from "./rules";

describe("password checks", () => {
  it("counts characters live and passes at twelve, as Mobile 25 and 28 draw it", () => {
    expect(lengthCheck(0, "Use at least 12.")).toEqual({
      success: undefined,
      hint: "Use at least 12.",
    });
    expect(lengthCheck(1, "Use at least 12.").hint).toBe("1 character  Use at least 12.");
    expect(lengthCheck(7, "At least 12.").hint).toBe("7 characters  At least 12.");
    expect(lengthCheck(16, "Use at least 12.")).toEqual({
      success: "16 characters",
      hint: "Use at least 12.",
    });
  });

  it("confirms a match at once and holds a mismatch until blur or equal length", () => {
    expect(confirmCheck("riverside-meadow", "riverside-meadow", false)).toEqual({
      success: "Passwords match",
      error: undefined,
    });
    expect(confirmCheck("riverside-meadow", "river", false).error).toBeUndefined();
    expect(confirmCheck("riverside-meadow", "river", true).error).toBe("Does not match yet");
    expect(confirmCheck("riverside-meadow", "riverside-meadox", false).error).toBe(
      "Does not match yet",
    );
    expect(confirmCheck("riverside-meadow", "", true)).toEqual({
      success: undefined,
      error: undefined,
    });
  });

  it("names the first thing that keeps Save new password off", () => {
    const long = "seventeen-chars!!";
    expect(resetDisabledReason("7305", long, long)).toBe(
      "The button turns on when all six digits of the code are in.",
    );
    expect(resetDisabledReason("730518", "short", "short")).toBe(
      "The button turns on when the new password has at least 12 characters.",
    );
    expect(resetDisabledReason("730518", long, "seventeen-chars")).toBe(
      "The button turns on when both passwords match.",
    );
    expect(resetDisabledReason("730518", long, long)).toBeUndefined();
  });
});

describe("words", () => {
  it("counts waiting records in the notes' sentences", () => {
    expect(waitingTitle(5)).toBe("5 records are waiting on this device.");
    expect(waitingTitle(1)).toBe("1 record is waiting on this device.");
    expect(stayingTitle(5)).toBe("5 records stay on this device");
    expect(stayingTitle(1)).toBe("1 record stays on this device");
  });

  it("reads a countdown in minutes and seconds", () => {
    expect(formatCountdown(24)).toBe("0:24");
    expect(formatCountdown(30)).toBe("0:30");
    expect(formatCountdown(65)).toBe("1:05");
    expect(formatCountdown(0)).toBe("0:00");
  });

  it("accepts addresses with a domain and refuses the rest", () => {
    expect(isEmail(" p.sudhakar@example.org ")).toBe(true);
    expect(isEmail("p.sudhakar@example")).toBe(false);
    expect(isEmail("p sudhakar@example.org")).toBe(false);
    expect(isEmail("")).toBe(false);
  });

  it("uses no exclamation marks and never says successfully", () => {
    for (const { title, body } of Object.values(SIGN_IN_MESSAGES)) {
      expect(`${title} ${body}`).not.toMatch(/!|successfully/i);
    }
  });
});

describe("sign-in failures", () => {
  it.each([
    [{ name: "AuthApiError", status: 400, code: "invalid_credentials" }, "credentials"],
    [{ status: 400, message: "Invalid login credentials" }, "credentials"],
    [{ status: 400, code: "email_not_confirmed" }, "unconfirmed"],
    [{ status: 429, code: "over_request_rate_limit" }, "rateLimited"],
    [{ name: "AuthRetryableFetchError", status: 0, message: "Failed to fetch" }, "network"],
    [new TypeError("Network request failed"), "network"],
    [{ name: "AuthApiError", status: 500, message: "Database error" }, "server"],
    ["something else", "server"],
  ] as const)("reads %o as %s", (error, failure) => {
    expect(signInFailure(error)).toBe(failure);
  });

  it("keeps the designed words for the three cases the design names", () => {
    expect(SIGN_IN_MESSAGES.credentials).toEqual({
      title: "That email and password do not match.",
      body: "Check both and try again.",
    });
    expect(SIGN_IN_MESSAGES.network).toEqual({
      title: "We could not reach the server.",
      body: "Your records are safe on this device. Try again when you have signal.",
    });
    expect(SIGN_IN_MESSAGES.notConfigured).toEqual({
      title: "This build is not connected to a server.",
      body: "Use Training to practise.",
    });
  });

  it("says the records are safe in every failure that is not about the typed details", () => {
    for (const [failure, { body }] of Object.entries(SIGN_IN_MESSAGES)) {
      if (failure === "credentials" || failure === "notConfigured") continue;
      expect(body).toContain("Your records are safe on this device.");
    }
  });
});

describe("the welcome plan", () => {
  it("projects Riverside's three zones and its features onto the plan", () => {
    expect(RIVERSIDE_PLAN.name).toBe("Riverside");
    expect(RIVERSIDE_PLAN.zones).toHaveLength(3);
    expect(RIVERSIDE_PLAN.trees).toHaveLength(23);
    expect(RIVERSIDE_PLAN.paths).toHaveLength(3);
    // North meadow's first vertex, as the zone editor lists it: (153, 90).
    const [x, y] = RIVERSIDE_PLAN.zones[0]?.points[0] ?? [0, 0];
    expect(x).toBeCloseTo(153, 0);
    expect(y).toBeCloseTo(90, 0);
  });

  it("draws fourteen markers, each inside a zone and inside the view", () => {
    expect(WELCOME_MARKERS).toHaveLength(14);
    for (const marker of WELCOME_MARKERS) {
      expect(RIVERSIDE_PLAN.zones.some((zone) => pointInPolygon(marker, zone.points))).toBe(true);
      expect(marker[0]).toBeGreaterThan(WELCOME_VIEW.x);
      expect(marker[0]).toBeLessThan(WELCOME_VIEW.x + WELCOME_VIEW.width);
      expect(marker[1]).toBeGreaterThan(WELCOME_VIEW.y);
      expect(marker[1]).toBeLessThan(WELCOME_VIEW.y + WELCOME_VIEW.height);
    }
  });
});
