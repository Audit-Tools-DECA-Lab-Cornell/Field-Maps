import { describe, expect, it } from "vitest";
import {
  createOrientationController,
  type NativeLock,
  nativeLock,
  orientationLock,
} from "./orientation-policy";

function recorder({ tablet = true, ios = false } = {}) {
  const device = { tablet };
  const calls: NativeLock[] = [];
  const controller = createOrientationController(
    async (lock) => {
      calls.push(lock);
    },
    () => device.tablet,
    ios,
  );
  return { calls, controller, device };
}

describe("Which way the screen may turn", () => {
  it("holds only a tablet on a map screen in landscape", () => {
    // Given each device on a reading screen and on a map screen.
    // Then only the tablet on the map is held; everything else follows the device.
    expect(orientationLock(true, 1)).toBe("landscape");
    expect(orientationLock(true, 0)).toBe("free");
    expect(orientationLock(false, 1)).toBe("free");
    expect(orientationLock(false, 0)).toBe("free");
  });

  it("lets an iPad turn upside down when free, and leaves every other device to its default", () => {
    // Given a free screen on each kind of device.
    // Then only the iPad allows every orientation; landscape is the same lock everywhere.
    expect(nativeLock("free", true, true)).toBe("ALL");
    expect(nativeLock("free", true, false)).toBe("DEFAULT");
    expect(nativeLock("free", false, true)).toBe("DEFAULT");
    expect(nativeLock("landscape", true, true)).toBe("LANDSCAPE");
    expect(nativeLock("landscape", false, true)).toBe("LANDSCAPE");
  });

  it("releases the launch lock at startup when no map screen is open", async () => {
    // Given a build that launched in landscape and a reading screen on top.
    const { calls, controller } = recorder();
    // When the root reconciles.
    await controller.reconcile();
    // Then the screen is set free, and a second reconcile changes nothing.
    await controller.reconcile();
    expect(calls).toEqual(["DEFAULT"]);
  });

  it("locks a tablet while the map is focused and frees it when another screen takes over", async () => {
    // Given a tablet opening the field map.
    const { calls, controller } = recorder();
    const release = controller.hold();
    await controller.reconcile();
    expect(calls).toEqual(["LANDSCAPE"]);
    // When the observer moves to the review sheet.
    release();
    await controller.reconcile();
    // Then the screen follows the device again.
    expect(calls).toEqual(["LANDSCAPE", "DEFAULT"]);
  });

  it("keeps the map's lock when the map focuses while the root's release is still in flight", async () => {
    // Given the root releasing the launch lock, with the native call not yet settled.
    const calls: NativeLock[] = [];
    let settle = () => {};
    const controller = createOrientationController(
      (lock) => {
        calls.push(lock);
        return lock === "DEFAULT"
          ? new Promise<void>((resolve) => {
              settle = resolve;
            })
          : Promise.resolve();
      },
      () => true,
      false,
    );
    const rootRelease = controller.reconcile();
    await Promise.resolve();
    // When the field map focuses before that call settles.
    controller.hold();
    settle();
    await rootRelease;
    await controller.reconcile();
    // Then the tablet ends held in landscape.
    expect(calls).toEqual(["DEFAULT", "LANDSCAPE"]);
  });

  it("lands on the latest state when focus and blur race ahead of the native call", async () => {
    // Given the map focused, blurred and focused again before any lock has settled.
    const { calls, controller } = recorder();
    controller.hold()();
    controller.hold();
    await controller.reconcile();
    // Then the tablet ends in landscape, without flipping through every intermediate state.
    expect(calls).toEqual(["LANDSCAPE"]);
  });

  it("ignores a second release of the same hold", async () => {
    // Given two map holds, one of which is released twice.
    const { calls, controller } = recorder();
    const first = controller.hold();
    controller.hold();
    first();
    first();
    await controller.reconcile();
    // Then the remaining hold still keeps the tablet in landscape.
    expect(calls).toEqual(["LANDSCAPE"]);
  });

  it("never locks a phone, even on the map", async () => {
    // Given a phone opening the field map.
    const { calls, controller } = recorder({ tablet: false });
    controller.hold();
    await controller.reconcile();
    // Then the phone is only ever set free.
    expect(calls).toEqual(["DEFAULT"]);
  });

  it("follows a foldable that changes screens while the map stays open", async () => {
    // Given an unfolded foldable held in landscape on the field map.
    const { calls, controller, device } = recorder();
    controller.hold();
    await controller.reconcile();
    // When it folds to its phone-sized screen and the screen size change is reconciled.
    device.tablet = false;
    await controller.reconcile();
    // Then the lock is released; unfolding again restores it.
    device.tablet = true;
    await controller.reconcile();
    expect(calls).toEqual(["LANDSCAPE", "DEFAULT", "LANDSCAPE"]);
  });

  it("tries again after the native call fails", async () => {
    // Given a native call that fails once.
    const calls: NativeLock[] = [];
    let failures = 1;
    const controller = createOrientationController(
      async (lock) => {
        calls.push(lock);
        if (failures-- > 0) throw new Error("lock refused");
      },
      () => true,
      false,
    );
    // When the root reconciles twice.
    await controller.reconcile();
    await controller.reconcile();
    // Then the failure is swallowed and the lock is applied on the second attempt.
    expect(calls).toEqual(["DEFAULT", "DEFAULT"]);
  });
});
