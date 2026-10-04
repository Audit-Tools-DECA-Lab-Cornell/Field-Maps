import { expect, it, vi } from "vitest";
import { allowedSession, persistDeletedSignOut, restoreAccount } from "./deleted-session";

const account = { id: "50000000-0000-4000-8000-000000000001" };
it("restores a deletion guard even when SecureStore still contains the deleted session", () => {
  const restored = restoreAccount(account, account);
  const lingering = { user: account, access_token: "stale-token" };
  expect(restored.account).toEqual(account);
  expect(allowedSession(lingering, restored.deletedUserId)).toBeNull();
  expect(allowedSession(null, restored.deletedUserId)).toBeNull();
  expect(restored.deletedUserId).toBe(account.id);
  expect(allowedSession({ user: { id: "other-account" } }, restored.deletedUserId)).not.toBeNull();
});
it("still attempts local sign-out when retaining the marker fails", async () => {
  const order: string[] = [];
  const pause = () => {
    order.push("paused");
  };
  const signOut = vi.fn(async () => {
    order.push("signed-out");
    return { error: null };
  });
  const error = await persistDeletedSignOut(
    account,
    pause,
    () => {
      order.push("write-failed");
      throw new Error("Disk full");
    },
    signOut,
  );
  expect(signOut).toHaveBeenCalledOnce();
  expect(order).toEqual(["paused", "write-failed", "signed-out"]);
  expect(error).toContain("offline recovery");
});
it.each(["returns", "throws"])("handles sign-out failure when it %s", async (mode) => {
  const retain = vi.fn();
  const error = await persistDeletedSignOut(
    account,
    () => {},
    retain,
    async () => {
      if (mode === "throws") throw new Error("Offline");
      return { error: new Error("Offline") };
    },
  );
  expect(retain).toHaveBeenCalledWith(account);
  expect(error).toContain("Uploads remain paused");
});
