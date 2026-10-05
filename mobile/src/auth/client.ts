import "react-native-url-polyfill/auto";
import { createClient, processLock } from "@supabase/supabase-js";
import { authStorage, migrateLegacySession } from "../platform/auth-storage";
import { connection } from "../sync/config";
import { cachedAccount, rememberAccount, sessionAccount } from "./cached-account";
import { deletedAccountStore } from "./deleted-account";
import { restoreAccount } from "./deleted-session";

export async function createAuthClient() {
  if (!connection) return null;
  const storageKey = `fieldmaps-auth-${new URL(connection.supabaseUrl).hostname}`;
  await migrateLegacySession(storageKey, connection.bundleIdSuffix === ".dev", (value) => {
    const migrated = sessionAccount(value);
    if (migrated) rememberAccount(migrated, connection.supabaseUrl);
  });
  const { account, deletedUserId } = restoreAccount(
    cachedAccount(connection.supabaseUrl),
    deletedAccountStore(connection.supabaseUrl).read(),
  );
  const client = createClient(connection.supabaseUrl, connection.publishableKey, {
    auth: {
      storageKey,
      storage: authStorage,
      autoRefreshToken: account?.id !== deletedUserId,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  });
  return { client, account, deletedUserId };
}
