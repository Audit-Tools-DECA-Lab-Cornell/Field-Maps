import { describe, expect, it } from "vitest";
import {
  createOrientationController,
  createOrientationPreference,
  DEFAULT_ORIENTATION,
  type NativeLock,
  nativeLock,
  type OrientationChoice,
  type PreferenceFile,
  readOrientationChoice,
  writeOrientationChoice,
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

function memoryFile(initial: string | null = null) {
  const stored = { text: initial, failWrites: false };
  const file: PreferenceFile = {
    read: () => stored.text,
    write: (text) => {
      if (stored.failWrites) throw new Error("disk full");
      stored.text = text;
    },
  };
  return { file, stored };
}

describe("Which way the screen may turn", () => {
  it("follows the device until the observer chooses otherwise", () => {
    expect(DEFAULT_ORIENTATION).toBe("device");
  });

  it("turns each choice into the same lock on a phone and a tablet", () => {
    // Given each choice on an Android phone and an Android tablet.
    // Then the device kind never changes what the observer chose.
    for (const tablet of [false, true]) {
      expect(nativeLock("device", false, tablet)).toBe("DEFAULT");
      expect(nativeLock("portrait", false, tablet)).toBe("PORTRAIT_UP");
      expect(nativeLock("landscape", false, tablet)).toBe("LANDSCAPE");
    }
  });

  it("lets an iPad turn upside down, and keeps an iPhone the right way up", () => {
    // Given iOS devices: an iPhone cannot take ALL or PORTRAIT, an iPad has no right way up.
    expect(nativeLock("device", true, true)).toBe("ALL");
    expect(nativeLock("portrait", true, true)).toBe("PORTRAIT");
    expect(nativeLock("landscape", true, true)).toBe("LANDSCAPE");
    expect(nativeLock("device", true, false)).toBe("DEFAULT");
    expect(nativeLock("portrait", true, false)).toBe("PORTRAIT_UP");
    expect(nativeLock("landscape", true, false)).toBe("LANDSCAPE");
  });

  it("releases the launch lock at startup when nothing has been chosen", async () => {
    // Given a build that launched in landscape and no stored choice.
    const { calls, controller } = recorder();
    // When the root reconciles.
    await controller.reconcile();
    // Then the screen is set free, and a second reconcile changes nothing.
    await controller.reconcile();
    expect(calls).toEqual(["DEFAULT"]);
  });

  it("keeps a tablet's chosen orientation through round selection, the map, review and saving", async () => {
    // Given an observer who chose portrait on a tablet — the device the map used to force sideways.
    const { calls, controller } = recorder();
    await controller.choose("portrait");
    // When the workflow moves through every screen, each of which may reconcile on focus or resize.
    for (let step = 0; step < 5; step += 1) await controller.reconcile();
    // Then the lock was applied once and never released or turned.
    expect(calls).toEqual(["PORTRAIT_UP"]);
  });

  it("applies a new choice at once, and only the latest when choices race the native call", async () => {
    // Given landscape chosen, then portrait and landscape again before any lock has settled.
    const { calls, controller } = recorder();
    void controller.choose("landscape");
    void controller.choose("portrait");
    await controller.choose("landscape");
    // Then the tablet ends in landscape, without flipping through every intermediate choice.
    expect(calls).toEqual(["LANDSCAPE"]);
  });

  it("keeps the stored choice when it lands while the launch release is still in flight", async () => {
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
    const release = controller.reconcile();
    await Promise.resolve();
    // When the stored landscape choice is applied before that call settles.
    const chosen = controller.choose("landscape");
    settle();
    await release;
    await chosen;
    // Then the device ends held in landscape.
    expect(calls).toEqual(["DEFAULT", "LANDSCAPE"]);
  });

  it("re-evaluates an iPad-sized screen that folds to a phone-sized one", async () => {
    // Given an unfolded foldable reporting iOS-style tablet rules, following the device.
    const { calls, controller, device } = recorder({ ios: true });
    await controller.reconcile();
    // When it folds to its phone-sized screen, and unfolds again.
    device.tablet = false;
    await controller.reconcile();
    device.tablet = true;
    await controller.reconcile();
    // Then upside-down is offered only while the screen is tablet-sized.
    expect(calls).toEqual(["ALL", "DEFAULT", "ALL"]);
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

describe("The observer's orientation preference", () => {
  it("round-trips every choice through its stored form", () => {
    for (const choice of ["device", "portrait", "landscape"] as const)
      expect(readOrientationChoice(writeOrientationChoice(choice))).toBe(choice);
  });

  it.each([
    null,
    "",
    "broken",
    "{}",
    '{"orientation":"sideways"}',
    '["landscape"]',
  ])("follows the device when the stored preference is missing or unreadable: %s", (text) => {
    expect(readOrientationChoice(text)).toBe("device");
  });

  it("is kept across a relaunch", () => {
    // Given an observer who chooses landscape.
    const { file } = memoryFile();
    const applied: OrientationChoice[] = [];
    const first = createOrientationPreference(file, (choice) => applied.push(choice));
    expect(first.current()).toBe("device");
    expect(first.choose("landscape")).toBeNull();
    // When the app starts again over the same storage.
    const relaunched = createOrientationPreference(file, () => {});
    // Then the choice is still landscape, and it was applied when it was made.
    expect(relaunched.current()).toBe("landscape");
    expect(applied).toEqual(["landscape"]);
  });

  it("tells subscribers when the choice changes, and only then", () => {
    const { file } = memoryFile(writeOrientationChoice("portrait"));
    const preference = createOrientationPreference(file, () => {});
    let notified = 0;
    const unsubscribe = preference.subscribe(() => {
      notified += 1;
    });
    preference.choose("portrait");
    preference.choose("landscape");
    unsubscribe();
    preference.choose("device");
    expect(notified).toBe(1);
  });

  it("still applies a choice that cannot be written, and says it was not kept", () => {
    // Given storage that refuses writes.
    const { file, stored } = memoryFile(writeOrientationChoice("portrait"));
    stored.failWrites = true;
    const applied: OrientationChoice[] = [];
    const preference = createOrientationPreference(file, (choice) => applied.push(choice));
    // When the observer chooses landscape.
    const problem = preference.choose("landscape");
    // Then the screen turns for this launch, the old stored value stands, and the observer is told.
    expect(applied).toEqual(["landscape"]);
    expect(preference.current()).toBe("landscape");
    expect(readOrientationChoice(stored.text)).toBe("portrait");
    expect(problem).toMatch(/could not be kept/);
  });

  it("follows the device when the stored preference cannot be read", () => {
    const preference = createOrientationPreference(
      {
        read: () => {
          throw new Error("permission denied");
        },
        write: () => {},
      },
      () => {},
    );
    expect(preference.current()).toBe("device");
  });
});
