import { requireOptionalNativeModule } from "expo";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect } from "react";
import { Dimensions, Platform } from "react-native";
import { createOrientationController, type NativeLock } from "./orientation-policy";
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
 * Mounted once at the root. It releases whatever lock the native build launched with — iOS builds
 * made before this rule shipped still start in landscape — unless a map screen already holds it,
 * and re-evaluates when the screen changes size, as a foldable does when it opens or closes.
 */
export function useOrientationPreference(): void {
  useEffect(() => {
    void controller.reconcile();
    const subscription = Dimensions.addEventListener("change", () => {
      void controller.reconcile();
    });
    return () => subscription.remove();
  }, []);
}

/**
 * For a screen where the observer works on the map: tablets are held in landscape while it is
 * focused and released as soon as another screen takes over. Phones are never locked.
 */
export function useLandscapeOnTablet(): void {
  useFocusEffect(useCallback(() => controller.hold(), []));
}
