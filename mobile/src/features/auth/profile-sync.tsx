import { useCallback, useEffect, useRef } from "react";
import { useAccount } from "../../auth/provider";
import type { ProfilePatch } from "../../data/api/identity";
import { type ApiResult, useMe } from "../../data/api/me-provider";
import { useDataSource } from "../preview/data-source";
import {
  markProfileSent,
  type ProfileEdit,
  pendingEdit,
  profileOwner,
  useProfile,
} from "./profile-store";

/**
 * Sends the observer profile saved on this device to the account (`PATCH /v1/me`). Onboarding saves
 * the name and initials here first, so nothing typed is lost offline; the edit stays pending until the
 * server confirms it, and is sent again on the next resume or `/v1/me` refresh.
 *
 * Each account has one send at a time. A newer edit saved while an older one is on its way waits for
 * that send to finish, whether it was saved or not, and then the edit pending at that moment is sent.
 * The account therefore ends with the newest edit: an older request can never land after a newer one.
 *
 * Preview data sends nothing, and an account the server reported deleted is never written to.
 */

/** What became of a pending edit. */
export type SendOutcome =
  /** The server saved it. */
  | "sent"
  /** Kept on this device for the next try: offline, no session, or the server could not answer. */
  | "queued"
  /** The server reported this account deleted; the gate takes over. */
  | "deleted"
  /** Nothing was waiting to be sent. */
  | "nothing";

/** What the step says while an edit waits on this phone. */
export const PROFILE_QUEUED = "Saved on this phone. It reaches your account when you are online.";

export function profilePatch(edit: ProfileEdit): ProfilePatch {
  return { display_name: edit.name, observer_initials: edit.initials };
}

/**
 * Sends one edit and confirms it on success. Pure apart from what it is handed, so the tests drive it
 * with a fake update and store.
 */
export async function sendProfileEdit(
  edit: ProfileEdit | null,
  update: (patch: ProfilePatch) => Promise<ApiResult>,
  confirm: (sent: ProfileEdit) => void,
): Promise<SendOutcome> {
  if (!edit) return "nothing";
  const result = await update(profilePatch(edit));
  if (result.ok) {
    confirm(edit);
    return "sent";
  }
  return result.error.code === "account_deleted" ? "deleted" : "queued";
}

/** Sends one edit to the account and settles how it went. */
export type ProfileSend = (edit: ProfileEdit) => Promise<SendOutcome>;

function sameEdit(a: ProfileEdit, b: ProfileEdit): boolean {
  return a.name === b.name && a.initials === b.initials;
}

/**
 * Keeps each owner's sends in order: one at a time, and always the edit pending when the send starts.
 * `read` returns an owner's pending edit as saved right now. The returned `flush` takes the `send` to
 * use, since only the caller knows which account it can reach.
 *
 * - Nothing pending: `"nothing"`.
 * - Nothing on its way for the owner: the pending edit is sent now.
 * - The pending edit is the one on its way: the caller shares that send, so it goes once.
 * - A different edit is pending: one follow-up waits for the send on its way to settle, whatever its
 *   outcome, then reads the pending edit again and sends that. Every flush made during the wait shares
 *   the follow-up and its `send` is the latest one handed in. After a deleted account, nothing is sent.
 */
export function createProfileSender(
  read: (owner: string) => ProfileEdit | null,
): (owner: string, send: ProfileSend) => Promise<SendOutcome> {
  type Sending = {
    readonly edit: ProfileEdit;
    readonly outcome: Promise<SendOutcome>;
    send: ProfileSend;
    next?: Promise<SendOutcome>;
  };
  const sending = new Map<string, Sending>();

  function flush(owner: string, send: ProfileSend): Promise<SendOutcome> {
    const edit = read(owner);
    if (!edit) return Promise.resolve("nothing");
    const running = sending.get(owner);
    if (running) {
      if (sameEdit(running.edit, edit)) return running.outcome;
      running.send = send;
      running.next ??= running.outcome.then(
        (outcome) => (outcome === "deleted" ? outcome : flush(owner, running.send)),
        () => flush(owner, running.send),
      );
      return running.next;
    }
    const outcome = (async () => send(edit))().finally(() => {
      if (sending.get(owner) === entry) sending.delete(owner);
    });
    const entry: Sending = { edit, outcome, send };
    sending.set(owner, entry);
    return outcome;
  }

  return flush;
}

/** Every account's sends, shared by the step and the queue. */
const sendInOrder = createProfileSender(pendingEdit);

/**
 * Sends the current account's pending profile edit, if there is one and it can be sent now. Safe to call
 * again while a send is under way: the same edit is sent once, and a newer edit goes after it (see
 * `createProfileSender`). The outcome is that of the send the call joined.
 */
export function useProfileSync(): { flush: () => Promise<SendOutcome> } {
  const { account, session, accountDeleted } = useAccount();
  const { mode } = useDataSource();
  const { updateProfile } = useMe();
  const owner = profileOwner(account?.id);
  const canSend = mode === "device" && account !== null && session !== null && !accountDeleted;

  // Checked when a send starts, which can be after a wait: an edit is never sent after a sign-out, or
  // through a session that now belongs to another account.
  const live = useRef({ owner, canSend });
  useEffect(() => {
    live.current = { owner, canSend };
    return () => {
      live.current = { owner, canSend: false };
    };
  }, [owner, canSend]);

  const flush = useCallback(async (): Promise<SendOutcome> => {
    if (!pendingEdit(owner)) return "nothing";
    if (!canSend) return "queued";
    return sendInOrder(owner, (edit) => {
      const now = live.current;
      if (now.owner !== owner || !now.canSend) return Promise.resolve("queued");
      return sendProfileEdit(edit, updateProfile, (sent) => markProfileSent(owner, sent));
    });
  }, [owner, canSend, updateProfile]);

  return { flush };
}

/**
 * Retries a pending profile edit whenever it might now go through: when it is saved, when the session
 * changes, and after each `/v1/me` refresh (which runs on sign-in and on every resume). Renders nothing.
 */
export function ProfileQueue() {
  const { flush } = useProfileSync();
  const { pending } = useProfile();
  const { profile } = useMe();
  // biome-ignore lint/correctness/useExhaustiveDependencies: every successful /v1/me read brings a new profile object, which is the cue to retry.
  useEffect(() => {
    if (pending) void flush();
  }, [pending, profile, flush]);
  return null;
}
