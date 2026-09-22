/**
 * Which way the screen may turn. Every screen follows the device — portrait or landscape, on a
 * phone or a tablet — except a map screen on a tablet, which is held in landscape: the field
 * layout puts the map and the question panel side by side, and a rotation mid-observation helps
 * nobody. Phones stay free on the map too, because a researcher holding a phone one-handed often
 * has no choice.
 *
 * Kept free of React Native so the rule and its ordering can be tested on their own.
 */

export type OrientationLock = "free" | "landscape";

/** The `expo-screen-orientation` lock a rule becomes on this device. */
export type NativeLock = "LANDSCAPE" | "ALL" | "DEFAULT";

export function orientationLock(tablet: boolean, landscapeHolds: number): OrientationLock {
  return tablet && landscapeHolds > 0 ? "landscape" : "free";
}

/**
 * An iPad has no right way up, so free there includes upside-down portrait. Everywhere else free
 * is the platform default: all but upside-down on iPhone, the sensor's choice on Android.
 */
export function nativeLock(lock: OrientationLock, ios: boolean, tablet: boolean): NativeLock {
  if (lock === "landscape") return "LANDSCAPE";
  return ios && tablet ? "ALL" : "DEFAULT";
}

export type OrientationController = {
  /** Applies the lock the current holds call for; resolves once the native call settles. */
  readonly reconcile: () => Promise<void>;
  /** Holds tablets in landscape until the returned release is called. Releasing twice is a no-op. */
  readonly hold: () => () => void;
};

/**
 * Native lock calls are asynchronous, and a screen can focus and blur faster than one settles.
 * Calls are therefore chained and each decides what to apply only when its turn comes, so the
 * last state always wins regardless of which caller asked first. Whether the device counts as a
 * tablet is read at that moment too, so a foldable that changes screens is re-evaluated on the
 * next reconcile. A failed call leaves nothing recorded as applied, so the next reconcile tries
 * again.
 */
export function createOrientationController(
  apply: (lock: NativeLock) => Promise<void>,
  isTablet: () => boolean,
  ios: boolean,
): OrientationController {
  let holds = 0;
  let applied: NativeLock | null = null;
  let queue: Promise<void> = Promise.resolve();

  function reconcile(): Promise<void> {
    queue = queue
      .then(async () => {
        const tablet = isTablet();
        const wanted = nativeLock(orientationLock(tablet, holds), ios, tablet);
        if (wanted === applied) return;
        applied = null;
        await apply(wanted);
        applied = wanted;
      })
      .catch(() => {});
    return queue;
  }

  function hold(): () => void {
    holds += 1;
    void reconcile();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      holds -= 1;
      void reconcile();
    };
  }

  return { reconcile, hold };
}
