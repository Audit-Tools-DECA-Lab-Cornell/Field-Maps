import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { useAccount } from "../../auth/provider";
import { connection } from "../../platform/config";
import { createApiClient } from "./client";
import { ApiError } from "./errors";
import { type MeSnapshot, refreshMeCache, selectProject } from "./me-cache";
import { meFileStore } from "./me-file";

type MeState = {
  readonly snapshot: MeSnapshot | null;
  readonly error: string | null;
  readonly ready: boolean;
};
const initial: MeState = { snapshot: null, error: null, ready: false };
const MeContext = createContext({ ...initial, selectProject: (_id: string) => {} });
export function MeProvider({ children }: PropsWithChildren) {
  const { account, client, session, markAccountDeleted } = useAccount();
  const userId = account?.id;
  const [state, setState] = useState(initial);
  const current = useRef<string | undefined>(userId);
  current.current = userId;
  const select = useRef((_id: string) => {});
  useEffect(() => {
    if (!userId) {
      setState({ ...initial, ready: true });
      return;
    }
    const id = userId;
    const controller = new AbortController();
    const store = meFileStore(connection.supabaseUrl, id);
    let snapshot = store.read();
    const isCurrent = () => !controller.signal.aborted && current.current === id;
    setState({ snapshot, error: null, ready: true });
    select.current = (projectId) => {
      if (!snapshot || !isCurrent() || selectProject(snapshot.identity, projectId) !== projectId)
        return;
      snapshot = { ...snapshot, activeProjectId: projectId };
      store.write(snapshot);
      setState({ snapshot, error: null, ready: true });
    };
    let busy = false;
    const refresh = async () => {
      if (busy || !client || !session || !isCurrent()) return;
      busy = true;
      try {
        const api = createApiClient(connection.apiUrl, async () => {
          const { data } = await client.auth.getSession();
          return data.session?.user.id === id ? data.session.access_token : null;
        });
        const identity = await api.me(controller.signal);
        if (!isCurrent()) return;
        if (identity.profile.user_id !== id) throw new ApiError("unknown", "retry");
        snapshot = refreshMeCache(identity, snapshot);
        store.write(snapshot);
        setState({ snapshot, error: null, ready: true });
      } catch (error) {
        if (!isCurrent()) return;
        if (!(error instanceof ApiError)) {
          if (!(error instanceof Error)) throw error;
          setState({
            snapshot,
            error: "Could not refresh your profile. Cached projects remain available.",
            ready: true,
          });
          return;
        }
        if (error.code === "account_deleted") markAccountDeleted();
        setState({ snapshot, error: error.message, ready: true });
      } finally {
        busy = false;
      }
    };
    void refresh();
    const listener = AppState.addEventListener("change", (value) => {
      if (value === "active") void refresh();
    });
    return () => {
      controller.abort();
      listener.remove();
      select.current = () => {};
    };
  }, [userId, client, session, markAccountDeleted]);
  return (
    <MeContext
      value={{
        ...state,
        snapshot: state.snapshot?.identity.profile.user_id === userId ? state.snapshot : null,
        selectProject: (id) => select.current(id),
      }}
    >
      {children}
    </MeContext>
  );
}
export function useMe() {
  const { snapshot, ...state } = useContext(MeContext);
  return {
    ...state,
    profile: snapshot?.identity.profile ?? null,
    projects: snapshot?.identity.project_memberships ?? [],
    activeProjectId: snapshot?.activeProjectId ?? null,
  };
}
