import { useCallback } from "react";
import { announce, useHaptics } from "../../ui";
import { useGate } from "../auth/gate";
import { useProfile } from "../auth/profile-store";

export type FinishOutcome = {
  /** The project joined, for the confirmation. Absent when the observer skipped for now. */
  joined?: string | undefined;
};

/**
 * Ends onboarding: the profile is marked finished, and the gate opens the app. The root layout's
 * Stack.Protected drops the onboarding group as soon as the gate changes and lands on the app's first
 * screen, so no screen navigates by itself (a replace issued before the gate changes would target a
 * route that is still guarded).
 *
 * Returns false, changing nothing, when no valid profile is saved yet.
 */
export function useFinishOnboarding(): (outcome?: FinishOutcome) => boolean {
  const profile = useProfile();
  const { devOverride, setDevOverride } = useGate();
  const haptics = useHaptics();
  return useCallback(
    (outcome: FinishOutcome = {}) => {
      if (!profile.finish()) return false;
      // A review build that forced onboarding carries on into the app it previews.
      if (devOverride === "onboarding") setDevOverride("signed-in");
      if (outcome.joined) {
        haptics.success();
        announce(`You joined ${outcome.joined}.`);
      }
      return true;
    },
    [profile, devOverride, setDevOverride, haptics],
  );
}
