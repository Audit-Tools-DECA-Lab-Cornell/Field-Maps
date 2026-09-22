import { useFocusEffect } from "expo-router";
import { useCallback, useEffect } from "react";
import { createOrientationController, type OrientationLock } from "./orientation-policy";
import { isTabletScreen } from "./use-layout";

/**
 * The native module only exists after a rebuild, so a missing one leaves orientation free
 * rather than stopping the app from opening. The rule itself lives in `orientation-policy.ts`.
 */
async function apply(lock: OrientationLock): Promise<void> {
  const orientation = await import("expo-screen-orientation");
  if (lock === "landscape") await orientation.lockAsync(orientation.OrientationLock.LANDSCAPE);
  else await orientation.unlockAsync();
}

const controller = createOrientationController(apply, isTabletScreen);

/**
 * Mounted once at the root. It releases whatever lock the native build launched with — builds
 * made before this rule shipped still start in landscape — unless a map screen already holds it.
 */
export function useOrientationPreference(): void {
  useEffect(() => {
    void controller.reconcile();
  }, []);
}

/**
 * For a screen where the observer works on the map: tablets are held in landscape while it is
 * focused and released as soon as another screen takes over. Phones are never locked.
 */
export function useLandscapeOnTablet(): void {
  useFocusEffect(useCallback(() => controller.hold(), []));
}
