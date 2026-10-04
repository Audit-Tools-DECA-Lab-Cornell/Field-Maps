/**
 * The rules and words the auth screens share (Mobile 23–28). Pure, so the tests can hold them to the
 * designs without rendering a screen.
 */

export const MIN_PASSWORD_LENGTH = 12;
/** Verification and recovery codes are six digits. */
export const CODE_LENGTH = 6;
/** A new code can be asked for this often. */
export const RESEND_SECONDS = 30;
/** The code that shows the wrong-code message while these screens run on preview data. */
export const WRONG_CODE_DEMO = "000000";

/**
 * Which auth calls reach the server today. Sign-in keeps the real `signInWithPassword`; the others are
 * built on preview data (MOB-24) and are wired by MOB-05 without changing their layout. A screen whose call
 * is not wired says so, so nothing claims a round trip that did not happen (PRODUCT.md, Honesty).
 */
export const AUTH_WIRED = {
  signIn: true,
  signUp: false,
  verify: false,
  recovery: false,
} as const;

/** Enough to catch a typo before anything is sent; the server decides what an address is. */
export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** "0:24": minutes and two-digit seconds, read in mono. */
export function formatCountdown(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function characters(count: number): string {
  return count === 1 ? "1 character" : `${count} characters`;
}

/**
 * The live length check under a new password: "✓ 16 characters  Use at least 12." once it is long
 * enough, the count and the rule in secondary ink while it is short, and the rule alone when empty.
 */
export function lengthCheck(
  length: number,
  rule: string,
): { success: string | undefined; hint: string } {
  if (length >= MIN_PASSWORD_LENGTH) return { success: characters(length), hint: rule };
  if (length === 0) return { success: undefined, hint: rule };
  return { success: undefined, hint: `${characters(length)}  ${rule}` };
}

export const PASSWORDS_MATCH = "Passwords match";
export const DOES_NOT_MATCH = "Does not match yet";

/**
 * The check under a confirmation. "Passwords match" as soon as they do; "Does not match yet" only once
 * the field has lost focus or is as long as the password, so nobody is told off mid-word.
 */
export function confirmCheck(
  password: string,
  confirm: string,
  left: boolean,
): { success: string | undefined; error: string | undefined } {
  const matches = confirm.length > 0 && confirm === password;
  if (matches) return { success: PASSWORDS_MATCH, error: undefined };
  const shown = confirm.length > 0 && (left || confirm.length >= password.length);
  return { success: undefined, error: shown ? DOES_NOT_MATCH : undefined };
}

/** Why "Save new password" is off, naming the first thing still missing, top to bottom. */
export function resetDisabledReason(
  code: string,
  password: string,
  confirm: string,
): string | undefined {
  if (code.length < CODE_LENGTH)
    return "The button turns on when all six digits of the code are in.";
  if (password.length < MIN_PASSWORD_LENGTH)
    return "The button turns on when the new password has at least 12 characters.";
  if (confirm !== password) return "The button turns on when both passwords match.";
  return undefined;
}

/** "5 records are waiting on this device." */
export function waitingTitle(count: number): string {
  return count === 1
    ? "1 record is waiting on this device."
    : `${count} records are waiting on this device.`;
}

/** "5 records stay on this device", which the recovery note runs on into its sentence. */
export function stayingTitle(count: number): string {
  return count === 1 ? "1 record stays on this device" : `${count} records stay on this device`;
}

/* ── Sign-in failures ─────────────────────────────────────────────────────── */

export type SignInFailure =
  | "credentials"
  | "unconfirmed"
  | "rateLimited"
  | "network"
  | "server"
  | "notConfigured";

/**
 * What a failed `signInWithPassword` means for the person holding the phone. Reads the fields supabase-js
 * errors carry (`code`, `status`, `name`, `message`) without depending on its classes.
 */
export function signInFailure(error: unknown): SignInFailure {
  if (typeof error !== "object" || error === null) return "server";
  const { code, status, name, message } = error as Record<string, unknown>;
  const text = typeof message === "string" ? message : "";
  if (code === "invalid_credentials" || /invalid login credentials/i.test(text))
    return "credentials";
  if (code === "email_not_confirmed" || /email not confirmed/i.test(text)) return "unconfirmed";
  if (status === 429 || code === "over_request_rate_limit" || code === "over_email_send_rate_limit")
    return "rateLimited";
  if (
    name === "AuthRetryableFetchError" ||
    name === "TypeError" ||
    status === 0 ||
    /network|failed to fetch|timed? ?out|offline/i.test(text)
  )
    return "network";
  return "server";
}

/**
 * The words for each failure: what happened, then what is safe, then what to do. On the collector an
 * error never hides that the records waiting here are still here.
 */
export const SIGN_IN_MESSAGES: Record<SignInFailure, { title: string; body: string }> = {
  credentials: {
    title: "That email and password do not match.",
    body: "Check both and try again.",
  },
  unconfirmed: {
    title: "This email address is not verified yet.",
    body: "Your records are safe on this device. Follow the verification email from FieldMaps, then sign in again.",
  },
  rateLimited: {
    title: "Too many sign-in attempts.",
    body: "Your records are safe on this device. Wait a few minutes, then try again.",
  },
  network: {
    title: "We could not reach the server.",
    body: "Your records are safe on this device. Try again when you have signal.",
  },
  server: {
    title: "The server could not sign you in.",
    body: "Your records are safe on this device. Try again in a few minutes. If it keeps happening, ask your project coordinator.",
  },
  notConfigured: {
    title: "This build is not connected to a server.",
    body: "Use Training to practise.",
  },
};

/** What sign-in says after a new password is saved. Until recovery is wired, it says nothing changed. */
export const PASSWORD_CHANGED = AUTH_WIRED.recovery
  ? "Password changed. Sign in with the new one."
  : "Preview · No password was changed. Sign in with your current one.";
