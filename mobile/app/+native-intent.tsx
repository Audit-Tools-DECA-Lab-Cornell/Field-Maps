import { joinCodeFromLink } from "../src/features/onboarding/pending-invitation";
import { rememberInvitation } from "../src/features/onboarding/pending-invitation-store";

/**
 * Every link the system opens the collector with passes through here before a route is chosen. An
 * invitation link (`fieldmaps://join/DECA2026`, `fieldmaps://join?code=…`) leaves its code on this
 * device first, because the gate may not open the route it points to yet: signed out it lands on
 * welcome, and an account already set up lands on Projects. The code then waits there (pending
 * invitation) instead of being lost. The path itself is never changed, so onboarding still opens the
 * invitation directly, and nothing is joined without the confirm screen.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const code = joinCodeFromLink(path);
    if (code) rememberInvitation(code);
  } catch {
    // A link must never stop the app from opening.
  }
  return path;
}
