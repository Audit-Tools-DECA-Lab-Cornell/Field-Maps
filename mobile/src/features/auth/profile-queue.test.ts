import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../data/api/errors";

// The store and sender also hold their hooks; keep the native modules they reach out of a Node run.
vi.mock("expo-sqlite/kv-store", () => ({
  default: { getItemSync: () => null, setItemSync: () => undefined },
}));
vi.mock("../../auth/provider", () => ({ useAccount: () => ({}) }));
vi.mock("../../data/api/me-provider", () => ({ useMe: () => ({}) }));
vi.mock("../preview/data-source", () => ({ useDataSource: () => ({ mode: "device" }) }));

const { LOCAL_OWNER, pendingEditOf, withEdit, withFinished, withSent } = await import(
  "./profile-store"
);
const { PROFILE_QUEUED, profilePatch, sendProfileEdit } = await import("./profile-sync");

const owner = "50000000-0000-4000-8000-000000000001";

describe("the profile queue on this device", () => {
  it("saves a new name and initials as an edit waiting for the account", () => {
    const saved = withEdit({}, owner, "  Pratyush   Sudhakar ", "PS");
    expect(saved?.[owner]).toEqual({
      name: "Pratyush Sudhakar",
      initials: "PS",
      onboarded: false,
      pending: true,
    });
    expect(pendingEditOf(saved ?? {}, owner)).toEqual({
      name: "Pratyush Sudhakar",
      initials: "PS",
    });
  });

  it("refuses an empty name or invalid initials, saving nothing", () => {
    expect(withEdit({}, owner, "  ", "PS")).toBeNull();
    expect(withEdit({}, owner, "Pratyush", "p.s")).toBeNull();
  });

  it("confirms only the edit that was sent", () => {
    const sent = { name: "Pratyush Sudhakar", initials: "PS" };
    const saved = withEdit({}, owner, sent.name, sent.initials) ?? {};
    expect(withSent(saved, owner, sent)[owner]?.pending).toBe(false);
    // A newer edit saved while the first was on its way stays queued and goes next.
    const newer = withEdit(saved, owner, "Pratyush Sudhakar", "PRS") ?? {};
    expect(withSent(newer, owner, sent)).toBe(newer);
    expect(pendingEditOf(newer, owner)).toEqual({ name: "Pratyush Sudhakar", initials: "PRS" });
  });

  it("does not queue the same values again once the account has them", () => {
    const sent = { name: "Pratyush Sudhakar", initials: "PS" };
    const confirmed = withSent(withEdit({}, owner, sent.name, sent.initials) ?? {}, owner, sent);
    expect(withEdit(confirmed, owner, sent.name, sent.initials)?.[owner]?.pending).toBe(false);
    expect(withEdit(confirmed, owner, "Pratyush Sudhakar", "PRS")?.[owner]?.pending).toBe(true);
  });

  it("keeps onboarding progress through edits and confirmations", () => {
    const saved = withEdit({}, owner, "Pratyush Sudhakar", "PS") ?? {};
    const finished = withFinished(saved, owner) ?? {};
    expect(finished[owner]).toMatchObject({ onboarded: true, pending: true });
    expect(withEdit(finished, owner, "Pratyush Sudhakar", "PRS")?.[owner]?.onboarded).toBe(true);
    expect(withFinished({}, owner)).toBeNull();
  });

  it("never queues the profile kept without an account, which has nowhere to go", () => {
    const saved = withEdit({}, LOCAL_OWNER, "Pratyush Sudhakar", "PS") ?? {};
    expect(saved[LOCAL_OWNER]?.pending).toBe(false);
    expect(pendingEditOf(saved, LOCAL_OWNER)).toBeNull();
  });

  it("keeps other accounts' profiles apart", () => {
    const other = "50000000-0000-4000-8000-000000000002";
    const saved = withEdit(withEdit({}, other, "Alex Rivera", "AR") ?? {}, owner, "Pratyush", "PS");
    expect(saved?.[other]?.initials).toBe("AR");
    expect(pendingEditOf(saved ?? {}, other)).toEqual({ name: "Alex Rivera", initials: "AR" });
  });
});

describe("sending the profile to the account", () => {
  const edit = { name: "Pratyush Sudhakar", initials: "PS" };

  it("patches the display name and observer initials", () => {
    expect(profilePatch(edit)).toEqual({
      display_name: "Pratyush Sudhakar",
      observer_initials: "PS",
    });
  });

  it("confirms the edit when the server saves it", async () => {
    const update = vi.fn(async () => ({ ok: true }) as const);
    const confirm = vi.fn();
    await expect(sendProfileEdit(edit, update, confirm)).resolves.toBe("sent");
    expect(update).toHaveBeenCalledWith({
      display_name: "Pratyush Sudhakar",
      observer_initials: "PS",
    });
    expect(confirm).toHaveBeenCalledWith(edit);
  });

  it.each([
    ["offline", new ApiError("unknown", "retry")],
    ["without a session", new ApiError("unauthenticated", "sign-in")],
    ["when the server is down", new ApiError("storage_unavailable", "retry")],
  ])("keeps the edit queued %s", async (_case, error) => {
    const confirm = vi.fn();
    await expect(sendProfileEdit(edit, async () => ({ ok: false, error }), confirm)).resolves.toBe(
      "queued",
    );
    expect(confirm).not.toHaveBeenCalled();
  });

  it("hands a deleted account to the gate", async () => {
    const error = new ApiError("account_deleted", "rejected");
    await expect(sendProfileEdit(edit, async () => ({ ok: false, error }), vi.fn())).resolves.toBe(
      "deleted",
    );
  });

  it("sends nothing when nothing is waiting", async () => {
    const update = vi.fn();
    await expect(sendProfileEdit(null, update, vi.fn())).resolves.toBe("nothing");
    expect(update).not.toHaveBeenCalled();
  });

  it("says plainly where a queued edit is", () => {
    expect(PROFILE_QUEUED).toBe(
      "Saved on this phone. It reaches your account when you are online.",
    );
  });
});
