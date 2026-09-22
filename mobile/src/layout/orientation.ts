import { useEffect } from "react";
import { isTabletScreen } from "./use-layout";

/**
 * Tablets are landscape only — the field layout is designed for it and a rotation mid-
 * observation helps nobody. Phones open in landscape but may be turned upright, because a
 * researcher holding a phone one-handed often has no choice.
 *
 * The native module only exists after a rebuild, so a missing one leaves orientation free
 * rather than stopping the app from opening.
 */
export function useOrientationPreference(): void {
  useEffect(() => {
    let cancelled = false;
    void import("expo-screen-orientation")
      .then(async (orientation) => {
        if (cancelled) return;
        await orientation.lockAsync(orientation.OrientationLock.LANDSCAPE);
        if (isTabletScreen() || cancelled) return;
        await orientation.unlockAsync();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
}
