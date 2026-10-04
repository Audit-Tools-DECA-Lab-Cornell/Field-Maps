import Storage from "expo-sqlite/kv-store";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { z } from "zod";
import { useAccount } from "../../auth/provider";
import { cleanName, isValidInitials, NAME_MAX } from "../onboarding/identity";

/**
 * The observer profile on this device: a full name, the initials that become the observer code, and
 * whether onboarding finished. Kept in the synchronous key-value store under `fm.profile`, so the sign-in
 * gate knows where to go on the first frame.
 *
 * Profiles are kept per account. Field teams share devices, and a second observer who signs in must not
 * inherit the first one's initials, which would be stamped on their observations. A practice build has no
 * accounts and keeps one profile under `local`.
 */

const KEY = "fm.profile";

/** The owner of the profile in a practice build, which has no accounts. */
export const LOCAL_OWNER = "local";

const profileSchema = z.object({
  name: z.string(),
  initials: z.string(),
  /** Onboarding finished: the observer joined a project or chose to skip for now. */
  onboarded: z.boolean(),
});
const savedSchema = z.record(z.string(), profileSchema);

export type Profile = z.infer<typeof profileSchema>;
type SavedProfiles = Readonly<Record<string, Profile>>;

const EMPTY: SavedProfiles = {};
let cache: SavedProfiles | undefined;
const listeners = new Set<() => void>();

function load(): SavedProfiles {
  try {
    const raw = Storage.getItemSync(KEY);
    if (!raw) return EMPTY;
    const parsed = savedSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : EMPTY;
  } catch {
    return EMPTY;
  }
}

function readSaved(): SavedProfiles {
  cache ??= load();
  return cache;
}

function commit(next: SavedProfiles): void {
  cache = next;
  try {
    Storage.setItemSync(KEY, JSON.stringify(next));
  } catch {
    // A full disk: the profile still applies until the app closes.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Whose profile applies: the signed-in or cached account, or `local` in a practice build. */
export function profileOwner(accountId: string | null | undefined): string {
  return accountId ?? LOCAL_OWNER;
}

/** A profile the app can collect with: a name, valid initials, and onboarding finished. */
export function isProfileComplete(profile: Profile | undefined): boolean {
  return (
    profile?.onboarded === true &&
    cleanName(profile.name) !== "" &&
    isValidInitials(profile.initials)
  );
}

export type ProfileValue = {
  /** The account the profile belongs to. */
  owner: string;
  name: string;
  /** The observer code: one to ten uppercase letters or digits. */
  initials: string;
  /** A name and initials are saved for this account (onboarding step 1 is done). */
  saved: boolean;
  /** Saved, valid and onboarding finished: the gate opens the app. */
  complete: boolean;
  /** Saves the name and initials. Returns false, saving nothing, when either is not valid. */
  set: (name: string, initials: string) => boolean;
  /** Marks onboarding finished. Returns false when no valid profile is saved yet. */
  finish: () => boolean;
  /** Forgets this account's profile on this device. Observations keep the code they were saved with. */
  clear: () => void;
};

/** The current account's observer profile. */
export function useProfile(): ProfileValue {
  const { account } = useAccount();
  const owner = profileOwner(account?.id);
  const saved = useSyncExternalStore(subscribe, readSaved, readSaved);
  const profile = saved[owner];

  const set = useCallback(
    (name: string, initials: string) => {
      const cleaned = cleanName(name).slice(0, NAME_MAX);
      if (cleaned === "" || !isValidInitials(initials)) return false;
      const current = readSaved();
      commit({
        ...current,
        [owner]: { name: cleaned, initials, onboarded: current[owner]?.onboarded ?? false },
      });
      return true;
    },
    [owner],
  );

  const finish = useCallback(() => {
    const current = readSaved();
    const existing = current[owner];
    if (!existing || !isValidInitials(existing.initials) || cleanName(existing.name) === "")
      return false;
    if (!existing.onboarded) commit({ ...current, [owner]: { ...existing, onboarded: true } });
    return true;
  }, [owner]);

  const clear = useCallback(() => {
    const current = readSaved();
    if (!(owner in current)) return;
    const { [owner]: _removed, ...rest } = current;
    commit(rest);
  }, [owner]);

  return useMemo(
    () => ({
      owner,
      name: profile?.name ?? "",
      initials: profile?.initials ?? "",
      saved: profile !== undefined,
      complete: isProfileComplete(profile),
      set,
      finish,
      clear,
    }),
    [owner, profile, set, finish, clear],
  );
}
