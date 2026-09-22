/**
 * An observation belongs to the account and the site package that started it.
 *
 * Both bindings are captured when the point is placed and checked before anything is written,
 * because the provider survives a sign-out and a change of study: without them, a signed-out
 * observer's research data could be written under the next account, and an unfinished
 * instrument observation could be saved against another package's form and round context.
 */

export type ObservationIdentity = {
  readonly id: string;
  readonly startedAt: string;
  /** The account scope key in force when the observation was started. */
  readonly owner: string;
  readonly packageId: string;
  readonly packageName: string;
};

/** Why this observation may not be written under the given account and package, if it may not. */
export function ownershipProblem(
  identity: ObservationIdentity,
  account: string,
  packageId: string,
): string | null {
  if (identity.owner !== account || identity.packageId !== packageId)
    return "Your account or study changed while this observation was open. It cannot be saved here; its draft is kept for whoever started it.";
  return null;
}

/** Why another study may not be opened right now, if it may not. */
export function packageSwitchProblem(
  identity: ObservationIdentity | null,
  packageId: string,
): string | null {
  if (identity && identity.packageId !== packageId)
    return `An unfinished observation is open in ${identity.packageName}. Resume or discard it before opening another study.`;
  return null;
}
