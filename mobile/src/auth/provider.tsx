import type { Session, SupabaseClient } from "@supabase/supabase-js";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { ScreenMessage } from "../components/screen-message";
import { legacyScope } from "../data/legacy/scope";
import { connection } from "../sync/config";
import { scopeKey } from "../sync/contracts";
import type { CachedAccount } from "./cached-account";
import { createAuthClient } from "./client";
import { deletedAccountStore } from "./deleted-account";
import { allowedSession, isAccountDeleted, persistDeletedSignOut } from "./deleted-session";

type AuthState = {
  readonly client: SupabaseClient | null;
  readonly session: Session | null;
  readonly account: CachedAccount | null;
  readonly ready: boolean;
  /**
   * The stored session has been read back (or the first auth event arrived), so a null `session`
   * means there is none, not that it is still loading.
   */
  readonly restored: boolean;
  /**
   * The account the server reported deleted (403 account_deleted), set by markAccountDeleted and
   * restored from the deleted-account marker on restart. Cleared when another account signs in.
   */
  readonly deletedUserId: string | null;
  readonly error: string | null;
};
const initial: AuthState = {
  client: null,
  session: null,
  account: null,
  ready: !connection,
  restored: false,
  deletedUserId: null,
  error: null,
};
const AuthContext = createContext({ ...initial, markAccountDeleted: () => {} });

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState(initial);
  const deleted = useRef<string | null>(null);
  const markAccountDeleted = useCallback(() => {
    const account = state.account;
    const client = state.client;
    if (!account || !client) return;
    void persistDeletedSignOut(
      account,
      () => {
        deleted.current = account.id;
        client.auth.stopAutoRefresh();
        setState((previous) => ({
          ...previous,
          session: null,
          deletedUserId: account.id,
          error: "This account has been deleted. Local records remain available.",
        }));
      },
      (retained) => deletedAccountStore(connection.supabaseUrl).write(retained),
      () => client.auth.signOut({ scope: "local" }),
    ).then((error) => {
      if (error && deleted.current === account.id) setState((previous) => ({ ...previous, error }));
    });
  }, [state.account, state.client]);
  useEffect(() => {
    let active = true;
    let release = () => {};
    void createAuthClient()
      .then((result) => {
        if (!result) return;
        const { client, account, deletedUserId } = result;
        deleted.current = deletedUserId;
        if (!active) {
          client.auth.stopAutoRefresh();
          return;
        }
        setState({
          client,
          account,
          session: null,
          ready: true,
          restored: false,
          deletedUserId,
          error: null,
        });
        let authChanged = false;
        const { data } = client.auth.onAuthStateChange((event, session) => {
          if (event === "SIGNED_IN" && session && session.user.id !== deleted.current) {
            deleted.current = null;
            deletedAccountStore(connection.supabaseUrl).clear();
          }
          if (event === "SIGNED_OUT" && !deleted.current)
            deletedAccountStore(connection.supabaseUrl).clear();
          if (deleted.current && (!session || !allowedSession(session, deleted.current))) return;
          authChanged = true;
          if (active)
            setState((previous) => ({
              client,
              session,
              ready: true,
              restored: true,
              deletedUserId: deleted.current,
              error: null,
              account: session?.user ?? (event === "SIGNED_OUT" ? null : previous.account),
            }));
        });
        const appState = AppState.addEventListener("change", (value) => {
          if (value === "active" && !deleted.current) client.auth.startAutoRefresh();
          else client.auth.stopAutoRefresh();
        });
        if (AppState.currentState === "active" && !deleted.current) client.auth.startAutoRefresh();
        release = () => {
          data.subscription.unsubscribe();
          appState.remove();
          client.auth.stopAutoRefresh();
        };
        void client.auth
          .getSession()
          .then(({ data: sessionData, error }) => {
            if (active && !authChanged)
              setState((previous) => ({
                client,
                session: allowedSession(sessionData.session, deleted.current),
                account:
                  allowedSession(sessionData.session, deleted.current)?.user ?? previous.account,
                ready: true,
                restored: true,
                deletedUserId: deleted.current,
                error: error ? "Could not restore sign-in. Try signing in again." : null,
              }));
          })
          .catch(() => {
            if (active && !authChanged)
              setState((previous) => ({
                ...previous,
                client,
                session: null,
                ready: true,
                restored: true,
                error: "Could not restore sign-in. Saved account records remain available offline.",
              }));
          });
      })
      .catch(() => {
        if (active)
          setState({
            client: null,
            session: null,
            account: null,
            ready: true,
            restored: true,
            deletedUserId: null,
            error:
              "Sign-in could not start. Rebuild the development app after installing its native dependencies.",
          });
      });
    return () => {
      active = false;
      release();
    };
  }, []);
  return (
    <AuthContext value={{ ...state, markAccountDeleted }}>
      {state.ready ? (
        children
      ) : (
        <ScreenMessage
          title="Opening your workspace"
          detail="Restoring the account saved on this device…"
        />
      )}
    </AuthContext>
  );
}

export function useAccount() {
  const auth = useContext(AuthContext);
  const parsed = connection && auth.ready && auth.account ? legacyScope(auth.account.id) : null;
  const scope = parsed?.success ? parsed.data : null;
  const key = scope ? scopeKey(scope) : "local";
  const current = useRef(key);
  current.current = key;
  // The gate opens welcome for a deleted account, in place of onboarding or the app.
  const accountDeleted = isAccountDeleted(auth.deletedUserId, auth.account);
  return { ...auth, scope, key, current, accountDeleted, configured: connection !== null };
}
