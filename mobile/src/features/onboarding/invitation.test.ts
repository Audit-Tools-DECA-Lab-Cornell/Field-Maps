import { describe, expect, it } from "vitest";
import { joinCodeOf, resolveInvitation } from "./invitation";

describe("join codes", () => {
  it("keeps letters and digits in upper case, at most eight, from a typed or linked code", () => {
    expect(joinCodeOf("deca-2026")).toBe("DECA2026");
    expect(joinCodeOf(" DECA 2026 extra")).toBe("DECA2026");
    expect(joinCodeOf(["deca2026", "other"])).toBe("DECA2026");
    expect(joinCodeOf(undefined)).toBe("");
  });

  it("resolves the preview invitation for DECA2026 on preview data", () => {
    const lookup = resolveInvitation("deca2026", "preview");
    expect(lookup.status).toBe("found");
    if (lookup.status === "found") expect(lookup.invitation.project).toBe("Play Study");
  });

  it("finds nothing for another complete code", () => {
    expect(resolveInvitation("ABCD1234", "preview")).toEqual({ status: "unknown" });
  });

  it("does not look up a code that is not eight characters", () => {
    expect(resolveInvitation("DECA20", "preview")).toEqual({ status: "incomplete" });
  });

  it("says a lookup needs the server on device data, even for the preview code", () => {
    expect(resolveInvitation("DECA2026", "device")).toEqual({ status: "needs-server" });
  });
});
