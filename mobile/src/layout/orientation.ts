import { requireOptionalNativeModule } from "expo";
import { Directory, File, Paths } from "expo-file-system";
import { useEffect, useSyncExternalStore } from "react";
import { Dimensions, Platform } from "react-native";
import {
  createOrientationController,
  createOrientationPreference,
  type NativeLock,
  type OrientationChoice,
} from "./orientation-policy";
import { isTabletScreen } from "./use-layout";

/**
 * A build without the native module would raise a fatal error while the package is imported, so
 * its presence is checked first: without it, orientation is left free rather than the app
 * refusing to open. The rule itself lives in `orientation-policy.ts`.
 */
async function apply(lock: NativeLock): Promise<void> {
  if (!requireOptionalNativeModule("ExpoScreenOrientation")) return;
  const orientation = await import("expo-screen-orientation");
  await orientation.lockAsync(orientation.OrientationLock[lock]);
}

const controller = createOrientationController(apply, isTabletScreen, Platform.OS === "ios");

/**
 * Kept beside the other on-device JSON (`auth/last-account.json`, `accounts/…/me.json`). It
 * belongs to the device rather than an account: it applies before anyone signs in, and signing
 * out leaves it alone.
 */
function preferenceFile() {
  return new File(Paths.document, "preferences", "orientation.json");
}

const preference = createOrientationPreference(
  {
    read: () => {
      const file = preferenceFile();
      return file.exists ? file.textSync() : null;
    },
    write: (text) => {
      new Directory(Paths.document, "preferences").create({
        intermediates: true,
        idempotent: true,
      });
      preferenceFile().write(text);
    },
  },
  (choice) => {
    void controller.choose(choice);
  },
);

/**
 * Mounted once at the root. It applies the observer's stored choice — replacing whatever lock the
 * native build launched with — and re-evaluates when the screen changes size, as a foldable does
 * when it opens or closes. No screen sets its own lock.
 */
export function useOrientationPreference(): void {
  useEffect(() => {
    void controller.choose(preference.current());
    const subscription = Dimensions.addEventListener("change", () => {
      void controller.reconcile();
    });
    return () => subscription.remove();
  }, []);
}

/** The observer's choice and a setter that applies it at once and keeps it for the next launch. */
export function useOrientationChoice(): readonly [
  OrientationChoice,
  (choice: OrientationChoice) => string | null,
] {
  const choice = useSyncExternalStore(preference.subscribe, preference.current, preference.current);
  return [choice, preference.choose];
}
