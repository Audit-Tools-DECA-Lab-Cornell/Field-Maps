import { describe, expect, it } from "vitest";
import {
  createOrientationController,
  type OrientationLock,
  orientationLock,
} from "./orientation-policy";

function recorder(tablet = true) {
  const calls: OrientationLock[] = [];
  const controller = createOrientationController(
    async (lock) => {
      calls.push(lock);
    },
    () => tablet,
  );
  return { calls, controller };
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

  it("releases the launch lock at startup when no map screen is open", async () => {
    // Given a build that launched in landscape and a reading screen on top.
    const { calls, controller } = recorder();
    // When the root reconciles.
    await controller.reconcile();
    // Then the screen is set free, and a second reconcile changes nothing.
    await controller.reconcile();
    expect(calls).toEqual(["free"]);
  });

  it("locks a tablet while the map is focused and frees it when another screen takes over", async () => {
    // Given a tablet opening the field map.
    const { calls, controller } = recorder();
    const release = controller.hold();
    await controller.reconcile();
    expect(calls).toEqual(["landscape"]);
    // When the observer moves to the review sheet.
    release();
    await controller.reconcile();
    // Then the screen follows the device again.
    expect(calls).toEqual(["landscape", "free"]);
  });

  it("keeps the map's lock when the root reconciles after the map has already focused", async () => {
    // Given a relaunch straight onto the field map: the screen's focus effect runs before the root's.
    const { calls, controller } = recorder();
    controller.hold();
    // When the root releases the launch lock.
    await controller.reconcile();
    // Then the map's landscape hold is not undone.
    expect(calls).toEqual(["landscape"]);
  });

  it("lands on the latest state when focus and blur race ahead of the native call", async () => {
    // Given the map focused, blurred and focused again before any lock has settled.
    const { calls, controller } = recorder();
    controller.hold()();
    controller.hold();
    await controller.reconcile();
    // Then the tablet ends in landscape, without flipping through every intermediate state.
    expect(calls.at(-1)).toBe("landscape");
    expect(calls).toEqual(["landscape"]);
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
    expect(calls).toEqual(["landscape"]);
  });

  it("never locks a phone, even on the map", async () => {
    // Given a phone opening the field map.
    const { calls, controller } = recorder(false);
    controller.hold();
    await controller.reconcile();
    // Then the phone is only ever set free.
    expect(calls).toEqual(["free"]);
  });

  it("tries again after the native call fails", async () => {
    // Given a native module that fails once, as it does before a rebuild adds it.
    const calls: OrientationLock[] = [];
    let failures = 1;
    const controller = createOrientationController(
      async (lock) => {
        calls.push(lock);
        if (failures-- > 0) throw new Error("native module missing");
      },
      () => true,
    );
    // When the root reconciles twice.
    await controller.reconcile();
    await controller.reconcile();
    // Then the failure is swallowed and the lock is applied on the second attempt.
    expect(calls).toEqual(["free", "free"]);
  });
});
