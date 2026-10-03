import * as Haptics from "expo-haptics";
import { useMemo } from "react";
import { usePreferences } from "./preferences";

/**
 * Short taps that confirm what happened without the observer looking down: a tick when an answer is
 * chosen, a light tap when a point lands, a success when a record is stored. Only when the observer has
 * haptics on, and never an error if the device has none.
 */
export function useHaptics() {
  const { haptics } = usePreferences();
  return useMemo(() => {
    const run = (effect: () => Promise<void>) => {
      if (!haptics) return;
      effect().catch(() => undefined);
    };
    return {
      selection: () => run(() => Haptics.selectionAsync()),
      light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
      success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
      warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
    };
  }, [haptics]);
}
