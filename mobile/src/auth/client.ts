import "react-native-url-polyfill/auto";
import { createClient, processLock } from "@supabase/supabase-js";
import { connection } from "../sync/config";
import { cachedAccount } from "./cached-account";

export async function createAuthClient() {
  if (!connection) return null;
  const storage = await import("expo-secure-store");
  const storageKey = `fieldmaps-auth-${new URL(connection.supabaseUrl).hostname}`;
  const account = cachedAccount(await storage.getItemAsync(storageKey));
  const client = createClient(connection.supabaseUrl, connection.publishableKey, {
    auth: {
      storageKey,
      storage: {
        getItem: (key: string) => storage.getItemAsync(key),
        setItem: (key: string, value: string) => storage.setItemAsync(key, value),
        removeItem: (key: string) => storage.deleteItemAsync(key),
      },
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  });
  return { client, account };
}
