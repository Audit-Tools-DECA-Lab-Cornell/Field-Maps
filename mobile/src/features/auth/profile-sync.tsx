import { useCallback, useEffect } from "react";
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

/** One send per owner and edit at a time: the step and the queue share it. */
const inFlight = new Map<string, Promise<SendOutcome>>();

/**
 * Sends the current account's pending profile edit, if there is one and it can be sent now. Safe to call
 * again while a send is under way: the same edit is sent once.
 */
export function useProfileSync(): { flush: () => Promise<SendOutcome> } {
  const { account, session, accountDeleted } = useAccount();
  const { mode } = useDataSource();
  const { updateProfile } = useMe();
  const owner = profileOwner(account?.id);
  const canSend = mode === "device" && account !== null && session !== null && !accountDeleted;

  const flush = useCallback(async (): Promise<SendOutcome> => {
    const edit = pendingEdit(owner);
    if (!edit) return "nothing";
    if (!canSend) return "queued";
    const key = JSON.stringify([owner, edit.name, edit.initials]);
    const running = inFlight.get(key);
    if (running) return running;
    const sending = sendProfileEdit(edit, updateProfile, (sent) =>
      markProfileSent(owner, sent),
    ).finally(() => inFlight.delete(key));
    inFlight.set(key, sending);
    return sending;
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
