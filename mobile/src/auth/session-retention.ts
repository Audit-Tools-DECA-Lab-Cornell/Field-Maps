import type { AuthChangeEvent } from "@supabase/supabase-js";
import { legacyScope } from "../data/legacy/scope";
import { scopeKey } from "../sync/contracts";
import { type CachedAccount, sessionIdentity } from "./cached-account";

export function sessionChange<T extends { readonly user: CachedAccount }>(
  account: CachedAccount | null,
  event: AuthChangeEvent,
  session: T | null,
  issuer: string,
  deliberateUserId: string | null,
  previousError: string | null = null,
) {
  if (session) {
    if (session.user.id === deliberateUserId)
      return { session, account: session.user, error: previousError };
    return sessionIdentity(session, issuer);
  }
  const deliberate = event === "SIGNED_OUT" && account?.id === deliberateUserId;
  return {
    session: null,
    account: deliberate ? null : account,
    error: deliberate ? null : previousError,
  };
}

export function accountWorkspace(account: CachedAccount | null) {
  const parsed = account ? legacyScope(account.id) : null;
  const scope = parsed?.success ? parsed.data : null;
  return { scope, key: scope ? scopeKey(scope) : "local" };
}

export function signInRecovery(
  account: CachedAccount | null,
  session: { readonly user: CachedAccount } | null,
  deletedUserId: string | null,
) {
  return account && !session && account.id !== deletedUserId
    ? { email: account.email ?? "" }
    : null;
}
