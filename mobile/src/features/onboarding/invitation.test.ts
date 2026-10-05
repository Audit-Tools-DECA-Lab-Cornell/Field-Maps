import { describe, expect, it } from "vitest";
import { ApiError } from "../../data/api/errors";
import {
  formatExpiry,
  invitationFromPreview,
  invitationTarget,
  joinCodeOf,
  joinFailure,
  previewLookup,
  rateLimitedMessage,
  roleScope,
  scopeTitle,
  splitMessage,
} from "./invitation";

describe("join codes", () => {
  it("keeps letters and digits in upper case, at most eight, from a typed or linked code", () => {
    expect(joinCodeOf("deca-2026")).toBe("DECA2026");
    expect(joinCodeOf(" DECA 2026 extra")).toBe("DECA2026");
    expect(joinCodeOf(["deca2026", "other"])).toBe("DECA2026");
    expect(joinCodeOf(undefined)).toBe("");
  });

  it("resolves the preview invitation for DECA2026 on preview data", () => {
    const lookup = previewLookup("deca2026");
    expect(lookup.status).toBe("found");
    if (lookup.status === "found") {
      expect(lookup.invitation.project).toBe("Play Study");
      expect(lookup.invitation.role).toBe("observer");
      // The fixture's expiry moves with the clock, so the preview never shows an expired code.
      expect(formatExpiry(lookup.invitation.expiresAt)).not.toBe("Expired");
    }
  });

  it("finds nothing for another complete preview code, in the designed words", () => {
    expect(previewLookup("ABCD1234")).toEqual({
      status: "failed",
      failure: {
        kind: "invalid",
        message: "We could not find a project for that code. Check it with your coordinator.",
      },
    });
  });

  it("does not look up a code that is not eight characters", () => {
    expect(previewLookup("DECA20")).toEqual({ status: "incomplete" });
  });
});

describe("invitations from the server", () => {
  const preview = {
    organization_name: "DECA Lab",
    project_name: "Play Study",
    role: "observer",
    expires_at: "2026-10-11T18:00:00Z",
  } as const;

  it("shows what POST /v1/invitations/preview returned, with no invented inviter or sites", () => {
    const invitation = invitationFromPreview("DECA2026", preview);
    expect(invitation).toEqual({
      code: "DECA2026",
      organization: "DECA Lab",
      project: "Play Study",
      role: "observer",
      expiresAt: "2026-10-11T18:00:00Z",
    });
    expect(invitation.invitedBy).toBeUndefined();
    expect(invitation.sites).toBeUndefined();
    expect(invitationTarget(invitation)).toBe("Play Study");
  });

  it("asks about the organization for an invitation that joins no project", () => {
    const invitation = invitationFromPreview("ORGC0DE1", {
      ...preview,
      project_name: null,
      role: "member",
    });
    expect(invitationTarget(invitation)).toBe("DECA Lab");
    expect(scopeTitle("member")).toBe("As a member");
    expect(scopeTitle("admin")).toBe("As an admin");
    expect(scopeTitle("observer")).toBe("As an observer");
  });

  it("keeps the designed observer scope", () => {
    expect(roleScope("observer")).toEqual([
      { allowed: true, text: "Collect observations on mobile; your account remains your own." },
      { allowed: false, text: "No access to forms, maps, the team or project settings." },
    ]);
  });

  it("reads the expiry in local time with its context, and says when it has passed", () => {
    const now = new Date(2026, 9, 4, 12, 0);
    expect(formatExpiry(new Date(2026, 9, 11, 9, 5).toISOString(), now)).toBe("Oct 11 · 09:05");
    expect(formatExpiry(new Date(2027, 0, 2, 17, 30).toISOString(), now)).toBe(
      "Jan 02 2027 · 17:30",
    );
    expect(formatExpiry(new Date(2026, 9, 3).toISOString(), now)).toBe("Expired");
    expect(formatExpiry("not a date", now)).toBe("not a date");
  });
});

describe("join failures", () => {
  const failure = (code: ConstructorParameters<typeof ApiError>[0], retryAfter?: number) =>
    new ApiError(code, "rejected", retryAfter ?? null);

  it("says a code that opens nothing should be checked with the coordinator", () => {
    expect(joinFailure(failure("invitation_invalid"), "preview")).toEqual({
      kind: "invalid",
      message: "We could not find a project for that code. Check it with your coordinator.",
    });
  });

  it("adds that the observer may already be in the project when redeem refuses the code", () => {
    expect(joinFailure(failure("invitation_invalid"), "redeem").message).toBe(
      "We could not find a project for that code. Check it with your coordinator. You may already be in this project.",
    );
  });

  it("asks for a new code when the invitation expired", () => {
    expect(joinFailure(failure("invitation_expired"), "preview")).toEqual({
      kind: "expired",
      message: "This invitation has expired. Ask your coordinator for a new code.",
    });
  });

  it("names the wait from Retry-After, in whole minutes", () => {
    expect(joinFailure(failure("rate_limited", 300), "preview")).toEqual({
      kind: "rateLimited",
      message: "Too many tries. Wait 5 minutes, then try again.",
    });
    expect(rateLimitedMessage(61)).toBe("Too many tries. Wait 2 minutes, then try again.");
    expect(rateLimitedMessage(20)).toBe("Too many tries. Wait 1 minute, then try again.");
    expect(rateLimitedMessage(null)).toBe("Too many tries. Wait a few minutes, then try again.");
  });

  it.each([
    "unknown",
    "unauthenticated",
  ] as const)("keeps the code and asks for signal when there is no answer (%s)", (code) => {
    expect(joinFailure(new ApiError(code, "retry"), "redeem")).toEqual({
      kind: "offline",
      message: "Joining needs a connection. Your code is kept; try again when you have signal.",
    });
  });

  it("hands a deleted account to the gate", () => {
    expect(joinFailure(failure("account_deleted"), "preview").kind).toBe("deleted");
  });

  it("keeps the code when the server cannot answer", () => {
    expect(joinFailure(new ApiError("storage_unavailable", "retry"), "preview").kind).toBe(
      "server",
    );
    expect(joinFailure(new ApiError("token_invalid", "sign-in"), "preview").message).toContain(
      "Your code is kept",
    );
  });

  it("never blames, exclaims or says successfully", () => {
    const codes = [
      "invitation_invalid",
      "invitation_expired",
      "rate_limited",
      "unknown",
      "internal",
      "role_required",
    ] as const;
    for (const code of codes)
      for (const stage of ["preview", "redeem"] as const)
        expect(joinFailure(failure(code, 90), stage).message).not.toMatch(/!|successfully|oops/i);
  });

  it("titles a screen state with the first sentence", () => {
    expect(
      splitMessage("We could not find a project for that code. Check it with your coordinator."),
    ).toEqual({
      title: "We could not find a project for that code",
      rest: "Check it with your coordinator.",
    });
    expect(splitMessage("Nothing else.")).toEqual({ title: "Nothing else", rest: "" });
  });
});
