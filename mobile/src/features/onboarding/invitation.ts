import type { ApiError } from "../../data/api/errors";
import type { InvitationPreview } from "../../data/api/identity";
import { PREVIEW_INVITATION } from "../preview/fixtures";
import type { ScopeItem } from "./components";

/**
 * Join codes and invitations (MOB-06). On device data a code is looked up with
 * `POST /v1/invitations/preview` and accepted with `POST /v1/invitations/redeem`; preview data resolves
 * only the fixture code `DECA2026`, and sends nothing. Nothing is joined without the confirm screen.
 * Pure: the screens reach the API through `use-invitations`.
 */

export const JOIN_CODE_LENGTH = 8;

export type InvitationRole = InvitationPreview["role"];

export type Invitation = {
  code: string;
  organization: string;
  /** Null for an organization invitation, which joins no project. */
  project: string | null;
  role: InvitationRole;
  /** When the code stops working, as the server sent it (ISO 8601). */
  expiresAt: string;
  /** Preview data only: the server does not say who invited. */
  invitedBy?: string | undefined;
  /** Preview data only: sites arrive with map packages (MOB-14). */
  sites?: string | undefined;
};

export type JoinFailureKind =
  | "invalid"
  | "expired"
  | "rateLimited"
  | "offline"
  | "server"
  | "deleted";

/** Why a code did not open or join anything, in the step's words. */
export type JoinFailure = { kind: JoinFailureKind; message: string };

export type InvitationLookup =
  | { status: "found"; invitation: Invitation }
  /** Fewer than eight characters, or characters a code never has. */
  | { status: "incomplete" }
  | { status: "failed"; failure: JoinFailure };

/** A typed, pasted or linked code as the field keeps it: letters and digits in upper case, at most eight. */
export function joinCodeOf(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, JOIN_CODE_LENGTH);
}

/* ── Words ───────────────────────────────────────────────────────────────── */

/** The field message for a code that opens nothing. */
export const UNKNOWN_CODE =
  "We could not find a project for that code. Check it with your coordinator.";
/** Redeem refuses a code for a project the observer is already in with the same error. */
export const ALREADY_MEMBER = "You may already be in this project.";
export const EXPIRED_CODE = "This invitation has expired. Ask your coordinator for a new code.";
export const JOIN_OFFLINE =
  "Joining needs a connection. Your code is kept; try again when you have signal.";
export const JOIN_SERVER =
  "The FieldMaps server could not answer. Your code is kept; try again in a few minutes.";
export const JOIN_SESSION =
  "The server did not accept your sign-in. Your code is kept; close and reopen FieldMaps, then try again.";
export const JOIN_REFUSED = "This code could not be used. Check it with your coordinator.";
export const JOIN_DELETED = "This account was deleted. Nothing was joined.";
/** A link whose code is cut short. */
export const SHORT_CODE = "That code is not eight characters. Check it with your coordinator.";

/** A message's first sentence, without its full stop, and the rest: a screen state's title and body. */
export function splitMessage(message: string): { title: string; rest: string } {
  const end = message.indexOf(". ");
  if (end === -1) return { title: message.replace(/\.$/, ""), rest: "" };
  return { title: message.slice(0, end), rest: message.slice(end + 2) };
}

/** "Too many tries. Wait 5 minutes, then try again." from the server's Retry-After, in seconds. */
export function rateLimitedMessage(retryAfter: number | null): string {
  if (retryAfter === null) return "Too many tries. Wait a few minutes, then try again.";
  const minutes = Math.max(1, Math.ceil(retryAfter / 60));
  return `Too many tries. Wait ${minutes === 1 ? "1 minute" : `${minutes} minutes`}, then try again.`;
}

/**
 * What a failed preview or redeem means for the observer. The same `invitation_invalid` covers a code
 * that opens nothing and, on redeem, a project the observer is already in, so redeem says both.
 */
export function joinFailure(error: ApiError, stage: "preview" | "redeem"): JoinFailure {
  switch (error.code) {
    case "invitation_invalid":
    case "not_found":
    case "bad_request":
    case "validation_failed":
      return {
        kind: "invalid",
        message: stage === "redeem" ? `${UNKNOWN_CODE} ${ALREADY_MEMBER}` : UNKNOWN_CODE,
      };
    case "invitation_expired":
      return { kind: "expired", message: EXPIRED_CODE };
    case "rate_limited":
      return { kind: "rateLimited", message: rateLimitedMessage(error.retryAfter) };
    case "account_deleted":
      return { kind: "deleted", message: JOIN_DELETED };
    // No token to send (no session, as after an offline start), or no answer at all.
    case "unauthenticated":
    case "unknown":
      return { kind: "offline", message: JOIN_OFFLINE };
    case "token_invalid":
      return { kind: "server", message: JOIN_SESSION };
    case "internal":
    case "storage_unavailable":
      return { kind: "server", message: JOIN_SERVER };
    default:
      return { kind: "invalid", message: JOIN_REFUSED };
  }
}

/** A failure about the code itself, which belongs under the field; the rest is about the connection. */
export function isCodeProblem(failure: JoinFailure): boolean {
  return failure.kind === "invalid" || failure.kind === "expired";
}

/* ── Invitations ─────────────────────────────────────────────────────────── */

/** The invitation a code opens, from `POST /v1/invitations/preview`. */
export function invitationFromPreview(code: string, preview: InvitationPreview): Invitation {
  return {
    code,
    organization: preview.organization_name,
    project: preview.project_name,
    role: preview.role,
    expiresAt: preview.expires_at,
  };
}

/** Preview fixtures, by code. */
const PREVIEW_INVITATIONS: readonly Invitation[] = [PREVIEW_INVITATION];

/** Resolves a code against the preview fixtures, which is all preview data does. */
export function previewLookup(code: string): InvitationLookup {
  const clean = joinCodeOf(code);
  if (clean.length !== JOIN_CODE_LENGTH) return { status: "incomplete" };
  const invitation = PREVIEW_INVITATIONS.find((entry) => entry.code === clean);
  return invitation
    ? { status: "found", invitation }
    : { status: "failed", failure: { kind: "invalid", message: UNKNOWN_CODE } };
}

/** The name the confirm screen asks about: the project, or the organization for an org invitation. */
export function invitationTarget(invitation: Invitation): string {
  return invitation.project ?? invitation.organization;
}

const ROLE_LABELS: Record<InvitationRole, string> = {
  observer: "Observer",
  viewer: "Viewer",
  manager: "Manager",
  member: "Member",
  admin: "Admin",
};

export function roleLabel(role: InvitationRole): string {
  return ROLE_LABELS[role];
}

/** What the role can and cannot do, under "As an observer" (mobile-31). */
export function roleScope(role: InvitationRole): readonly ScopeItem[] {
  switch (role) {
    case "observer":
      return [
        { allowed: true, text: "Collect observations on mobile; your account remains your own." },
        { allowed: false, text: "No access to forms, maps, the team or project settings." },
      ];
    case "viewer":
      return [
        { allowed: true, text: "Read data and reports, and export the permitted scope." },
        { allowed: false, text: "No collecting, and no access to the team or project settings." },
      ];
    case "manager":
      return [
        { allowed: true, text: "Collect observations on mobile." },
        { allowed: true, text: "Manage forms, maps, the team and publication on the web." },
      ];
    case "admin":
      return [
        { allowed: true, text: "Create projects, invite and remove members on the web." },
        { allowed: true, text: "Act as a manager on every project in the organization." },
      ];
    case "member":
      return [
        { allowed: true, text: "Belong to the organization; your account remains your own." },
        { allowed: false, text: "Project access comes from project roles your coordinator gives." },
      ];
  }
}

/** "As an observer", "As an admin". */
export function scopeTitle(role: InvitationRole): string {
  const label = roleLabel(role).toLowerCase();
  return `As ${/^[aeiou]/.test(label) ? "an" : "a"} ${label}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * When the code stops working, in local time with its context: "Oct 31 · 23:59", with the year when it
 * is not this year's, and "Expired" once it has passed. The raw value when it is not a date.
 */
export function formatExpiry(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  if (date.getTime() <= now.getTime()) return "Expired";
  const day = String(date.getDate()).padStart(2, "0");
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  const year = date.getFullYear() === now.getFullYear() ? "" : ` ${date.getFullYear()}`;
  return `${MONTHS[date.getMonth()]} ${day}${year} · ${time}`;
}
