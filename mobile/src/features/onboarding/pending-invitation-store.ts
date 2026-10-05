import Storage from "expo-sqlite/kv-store";
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import {
  type PendingInvitation,
  readPendingInvitationValue,
  serializePendingInvitation,
} from "./pending-invitation";

/**
 * The invitation a link left waiting, kept on this device with the kv-store (synchronous, so the first
 * frame of welcome already shows it). One code at a time: a newer link replaces an older one. Not tied
 * to an account, because the link arrives before anyone has signed in; it holds only the code, which
 * is not a secret on its own (it still needs a signed-in account and the confirm screen to join).
 */

export const PENDING_INVITATION_KEY = "fm.pendingInvitation";

const listeners = new Set<() => void>();
/** A code that arrived by link while this app was running, not yet opened. Never stored. */
let fresh: string | null = null;
/** The stored string as last read or written; undefined until first read. */
let cache: string | null | undefined;

function readRaw(): string | null {
  if (cache === undefined) {
    try {
      cache = Storage.getItemSync(PENDING_INVITATION_KEY);
    } catch {
      cache = null;
    }
  }
  return cache;
}

function writeRaw(next: string | null): void {
  cache = next;
  try {
    if (next === null) Storage.removeItemSync(PENDING_INVITATION_KEY);
    else Storage.setItemSync(PENDING_INVITATION_KEY, next);
  } catch {
    // The code still waits until the app closes.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The invitation waiting on this device now, or null. An expired one is removed as it is read. */
export function readPendingInvitation(now: number = Date.now()): PendingInvitation | null {
  const raw = readRaw();
  const pending = readPendingInvitationValue(raw, now);
  if (raw !== null && pending === null) writeRaw(null);
  return pending;
}

/** Keeps a link's code. A code that is not eight characters is not kept. */
export function rememberInvitation(code: string, now: number = Date.now()): boolean {
  const value = serializePendingInvitation(code, now);
  if (value === null) return false;
  writeRaw(value);
  fresh = readPendingInvitation(now)?.code ?? null;
  return true;
}

/**
 * The code a link brought while the app was running, once: for an account already set up, Projects
 * opens it in the join screen as the link arrives. Null when it was already taken, forgotten or used.
 */
export function takeFreshInvitation(): string | null {
  const code = fresh;
  fresh = null;
  if (!code || readPendingInvitation()?.code !== code) return null;
  return code;
}

/** Forgets the waiting invitation; with a code, only when that is the one waiting. */
export function forgetInvitation(code?: string): void {
  if (code !== undefined && readPendingInvitation()?.code !== code) return;
  fresh = null;
  if (readRaw() !== null) writeRaw(null);
}

/**
 * Forgets a waiting code once its invitation has been shown and the screen is left: joined, declined
 * by going back, or set aside for another code. A screen that never got as far as showing it (a
 * redirect to the identity step first) leaves it waiting.
 */
export function useForgetInvitationOnLeave(code: string, shown: boolean): void {
  const seen = useRef<string | null>(null);
  useEffect(() => {
    if (shown && code) seen.current = code;
  }, [shown, code]);
  useEffect(
    () => () => {
      if (seen.current) forgetInvitation(seen.current);
    },
    [],
  );
}

export type PendingInvitationValue = {
  /** The waiting code, or null. */
  code: string | null;
  pending: PendingInvitation | null;
  /** "Forget this invitation". */
  forget: () => void;
};

/** The waiting invitation for a screen, kept current as it is stored, used or forgotten. */
export function usePendingInvitation(): PendingInvitationValue {
  const raw = useSyncExternalStore(subscribe, readRaw, readRaw);
  const pending = useMemo(() => readPendingInvitationValue(raw, Date.now()), [raw]);
  const forget = useCallback(() => forgetInvitation(), []);
  return useMemo(() => ({ code: pending?.code ?? null, pending, forget }), [pending, forget]);
}
