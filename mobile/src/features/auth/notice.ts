/**
 * A message one auth screen leaves for the next, such as "Password changed. Sign in with the new one."
 * on the way back to sign-in. Held in memory for one hand-over, so it never outlives the app session and
 * does not depend on whether the next screen is pushed or uncovered.
 */
export type AuthNotice = {
  message: string;
  /** saved for a change the server confirmed; neutral for anything else, such as a preview. */
  tone: "saved" | "neutral";
  /** The email to fill in on arrival. */
  email?: string | undefined;
};

let pending: AuthNotice | null = null;

export function leaveAuthNotice(notice: AuthNotice): void {
  pending = notice;
}

/** The waiting notice, once: reading it clears it. */
export function takeAuthNotice(): AuthNotice | null {
  const notice = pending;
  pending = null;
  return notice;
}
