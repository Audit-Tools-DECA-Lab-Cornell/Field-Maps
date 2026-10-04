import type { DataMode } from "../preview/data-source";
import { PREVIEW_INVITATION } from "../preview/fixtures";

/**
 * What a project join code resolves to before the observer accepts (MOB-06). The server does not offer
 * a join yet, so only preview data resolves a code: `DECA2026` opens the Play Study invitation. On the
 * device every lookup says plainly that it needs the server, and nothing claims to have joined.
 */

export const JOIN_CODE_LENGTH = 8;

export type Invitation = {
  code: string;
  organization: string;
  project: string;
  role: string;
  invitedBy: string;
  sites: string;
};

export type InvitationLookup =
  | { status: "found"; invitation: Invitation }
  /** Fewer than eight characters, or characters a code never has. */
  | { status: "incomplete" }
  | { status: "unknown" }
  /** Device data: looking a code up needs the FieldMaps server, which this build does not reach. */
  | { status: "needs-server" };

/** A typed, pasted or linked code as the field keeps it: letters and digits in upper case, at most eight. */
export function joinCodeOf(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, JOIN_CODE_LENGTH);
}

/** Preview fixtures, by code. */
const PREVIEW_INVITATIONS: readonly Invitation[] = [PREVIEW_INVITATION];

/** Resolves a code with what is on hand now. */
export function resolveInvitation(code: string, mode: DataMode): InvitationLookup {
  const clean = joinCodeOf(code);
  if (clean.length !== JOIN_CODE_LENGTH) return { status: "incomplete" };
  if (mode !== "preview") return { status: "needs-server" };
  const invitation = PREVIEW_INVITATIONS.find((entry) => entry.code === clean);
  return invitation ? { status: "found", invitation } : { status: "unknown" };
}

/**
 * Looks a code up. Asynchronous because the real lookup (`POST /v1/invitations/preview`) will be; the
 * preview answers at once.
 */
export async function lookupInvitation(code: string, mode: DataMode): Promise<InvitationLookup> {
  return resolveInvitation(code, mode);
}

/** The field message for a code that resolved to nothing. */
export const UNKNOWN_CODE =
  "We could not find a project for that code. Check it with your coordinator.";

/** Why the preview button is off on device data. */
export const NEEDS_SERVER_REASON =
  "Looking up a code needs the FieldMaps server, which this build cannot reach yet. Skip for now to practise in Training.";
