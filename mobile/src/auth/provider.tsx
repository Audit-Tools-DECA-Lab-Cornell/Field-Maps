import type { Session, SupabaseClient } from "@supabase/supabase-js";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { ScreenMessage } from "../components/screen-message";
import { connection } from "../sync/config";
import { scopeKey, syncScopeSchema } from "../sync/contracts";
import type { CachedAccount } from "./cached-account";
import { createAuthClient } from "./client";

type AuthState = {
  readonly client: SupabaseClient | null;
  readonly session: Session | null;
  readonly account: CachedAccount | null;
  readonly ready: boolean;
  readonly error: string | null;
};
const initial: AuthState = {
  client: null,
  session: null,
  account: null,
  ready: !connection,
  error: null,
};
const AuthContext = createContext(initial);

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState(initial);
  useEffect(() => {
    let active = true;
    let release = () => {};
    void createAuthClient()
      .then((result) => {
        if (!result) return;
        const { client, account } = result;
        if (!active) {
          client.auth.stopAutoRefresh();
          return;
        }
        setState({ client, account, session: null, ready: true, error: null });
        let authChanged = false;
        const { data } = client.auth.onAuthStateChange((event, session) => {
          authChanged = true;
          if (active)
            setState((previous) => ({
              client,
              session,
              ready: true,
              error: null,
              account: session?.user ?? (event === "SIGNED_OUT" ? null : previous.account),
            }));
        });
        const appState = AppState.addEventListener("change", (value) => {
          if (value === "active") client.auth.startAutoRefresh();
          else client.auth.stopAutoRefresh();
        });
        if (AppState.currentState === "active") client.auth.startAutoRefresh();
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
                session: sessionData.session,
                account: sessionData.session?.user ?? previous.account,
                ready: true,
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
    <AuthContext value={state}>
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
  const parsed =
    connection && auth.ready && auth.account
      ? syncScopeSchema.safeParse({
          apiUrl: connection.apiUrl.replace(/\/$/, ""),
          issuer: `${connection.supabaseUrl.replace(/\/$/, "")}/auth/v1`,
          projectId: connection.projectId,
          userId: auth.account.id,
        })
      : null;
  const scope = parsed?.success ? parsed.data : null;
  const key = scope ? scopeKey(scope) : "local";
  const current = useRef(key);
  current.current = key;
  return { ...auth, scope, key, current, configured: connection !== null };
}
