import { z } from "zod";

/**
 * Which way the screen may turn. One choice, made by the observer, applies to every screen: no
 * screen locks or releases orientation on its own, so choosing a round, placing a point, answering
 * and saving never turn the device's picture over mid-observation. The field map lays itself out
 * side by side in landscape and stacked in portrait, so the whole workflow runs either way.
 *
 * Kept free of React Native so the rule, its ordering and its storage format can be tested on
 * their own.
 */

export const ORIENTATION_CHOICES = ["device", "portrait", "landscape"] as const;
export type OrientationChoice = (typeof ORIENTATION_CHOICES)[number];

/** Following the device is what every screen did before a choice existed. */
export const DEFAULT_ORIENTATION: OrientationChoice = "device";

export const orientationLabels: Readonly<Record<OrientationChoice, string>> = {
  device: "Follow the device",
  portrait: "Portrait",
  landscape: "Landscape",
};

/** The `expo-screen-orientation` lock a choice becomes on this device. */
export type NativeLock = "DEFAULT" | "ALL" | "PORTRAIT" | "PORTRAIT_UP" | "LANDSCAPE";

/**
 * An iPad has no right way up, so following the device or holding portrait there includes
 * upside-down. Everywhere else following the device is the platform default — all but upside-down
 * on iPhone, the sensor's choice on Android — and portrait is the upright one, because `ALL` and
 * `PORTRAIT` are invalid on a device that cannot turn upside down. Landscape is either side.
 */
export function nativeLock(choice: OrientationChoice, ios: boolean, tablet: boolean): NativeLock {
  const anyWayUp = ios && tablet;
  if (choice === "landscape") return "LANDSCAPE";
  if (choice === "portrait") return anyWayUp ? "PORTRAIT" : "PORTRAIT_UP";
  return anyWayUp ? "ALL" : "DEFAULT";
}

const storedSchema = z.object({ orientation: z.enum(ORIENTATION_CHOICES) });

/** A missing, unreadable or unknown preference falls back to following the device. */
export function readOrientationChoice(text: string | null): OrientationChoice {
  if (!text) return DEFAULT_ORIENTATION;
  try {
    const parsed = storedSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data.orientation : DEFAULT_ORIENTATION;
  } catch (error) {
    if (error instanceof SyntaxError) return DEFAULT_ORIENTATION;
    throw error;
  }
}

export function writeOrientationChoice(choice: OrientationChoice): string {
  return JSON.stringify({ orientation: choice });
}

export type OrientationController = {
  /** Applies the lock the current choice calls for; resolves once the native call settles. */
  readonly reconcile: () => Promise<void>;
  /** Records the observer's choice and applies it. */
  readonly choose: (choice: OrientationChoice) => Promise<void>;
};

/**
 * Native lock calls are asynchronous, and the observer can change their mind faster than one
 * settles. Calls are therefore chained and each decides what to apply only when its turn comes,
 * so the last choice always wins. Whether the device counts as a tablet is read at that moment
 * too, so a foldable that changes screens is re-evaluated on the next reconcile. A failed call
 * leaves nothing recorded as applied, so the next reconcile tries again.
 */
export function createOrientationController(
  apply: (lock: NativeLock) => Promise<void>,
  isTablet: () => boolean,
  ios: boolean,
  initial: OrientationChoice = DEFAULT_ORIENTATION,
): OrientationController {
  let choice = initial;
  let applied: NativeLock | null = null;
  let queue: Promise<void> = Promise.resolve();

  function reconcile(): Promise<void> {
    queue = queue
      .then(async () => {
        const wanted = nativeLock(choice, ios, isTablet());
        if (wanted === applied) return;
        applied = null;
        await apply(wanted);
        applied = wanted;
      })
      .catch(() => {});
    return queue;
  }

  function choose(next: OrientationChoice): Promise<void> {
    choice = next;
    return reconcile();
  }

  return { reconcile, choose };
}

/** Where the preference is kept. Reads return null when nothing has been stored yet. */
export type PreferenceFile = {
  readonly read: () => string | null;
  readonly write: (text: string) => void;
};

export type OrientationPreference = {
  readonly current: () => OrientationChoice;
  /** Applies the choice at once; returns a message when it could not be kept for next launch. */
  readonly choose: (choice: OrientationChoice) => string | null;
  readonly subscribe: (listener: () => void) => () => void;
};

/**
 * The observer's choice, read once from the device and written back whenever it changes. A choice
 * that cannot be written still applies for the rest of this launch: the screen should not refuse
 * to turn because storage is full.
 */
export function createOrientationPreference(
  file: PreferenceFile,
  onChange: (choice: OrientationChoice) => void,
): OrientationPreference {
  let choice: OrientationChoice | null = null;
  const listeners = new Set<() => void>();

  function current(): OrientationChoice {
    if (choice === null) {
      try {
        choice = readOrientationChoice(file.read());
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        choice = DEFAULT_ORIENTATION;
      }
    }
    return choice;
  }

  function choose(next: OrientationChoice): string | null {
    let problem: string | null = null;
    try {
      file.write(writeOrientationChoice(next));
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      problem = "Your orientation choice applies now but could not be kept on this device.";
    }
    if (next !== current()) {
      choice = next;
      for (const listener of listeners) listener();
    }
    onChange(next);
    return problem;
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return { current, choose, subscribe };
}
