import { useSQLiteContext } from "expo-sqlite";
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
import { useAccount } from "../auth/provider";
import { retryAttention } from "../storage/sync-store";
import { createSyncCoordinator } from "./coordinator";
import { uploadObservation } from "./upload";

const SyncContext = createContext({
  revision: 0,
  error: "",
  wake: () => {},
  retry: async () => {},
});

export function SyncProvider({ children }: PropsWithChildren) {
  const database = useSQLiteContext();
  const { client, scope, key, current } = useAccount();
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const trigger = useRef(() => {});
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const wake = useCallback(() => {
    setRevision((value) => value + 1);
    trigger.current();
  }, []);
  useEffect(() => {
    const activeScope = scopeRef.current;
    if (!client || !activeScope) return;
    const controller = new AbortController();
    let online = false;
    let busy = false;
    let removeNetwork = () => {};
    const isCurrent = () => current.current === key && !controller.signal.aborted;
    const drain = createSyncCoordinator({
      database,
      scope: activeScope,
      isCurrent,
      getToken: async () => {
        const { data, error: authError } = await client.auth.getSession();
        return !authError && data.session?.user.id === activeScope.userId
          ? data.session.access_token
          : null;
      },
      upload: (record, token, signal) => uploadObservation(activeScope, record, token, signal),
    });
    const run = async () => {
      if (busy || !online || !isCurrent() || AppState.currentState !== "active") return;
      busy = true;
      try {
        await drain(controller.signal);
        if (isCurrent()) {
          setError("");
          setRevision((value) => value + 1);
        }
      } catch {
        if (isCurrent())
          setError(
            "Synchronization paused. Your records are safe on this device; another attempt will follow.",
          );
      } finally {
        busy = false;
      }
    };
    const triggerRun = () => {
      void run();
    };
    trigger.current = triggerRun;
    void import("@react-native-community/netinfo")
      .then(({ default: network }) => {
        if (!isCurrent()) return;
        removeNetwork = network.addEventListener((state) => {
          online = state.isConnected === true && state.isInternetReachable !== false;
          triggerRun();
        });
      })
      .catch(() => {
        if (isCurrent()) setError("Rebuild the development app to enable network monitoring.");
      });
    const appState = AppState.addEventListener("change", triggerRun);
    const timer = setInterval(triggerRun, 5000);
    return () => {
      controller.abort();
      removeNetwork();
      appState.remove();
      clearInterval(timer);
      trigger.current = () => {};
    };
  }, [client, current, database, key]);
  const retry = useCallback(async () => {
    if (key === "local") return;
    await retryAttention(database, key);
    wake();
  }, [database, key, wake]);
  return (
    <SyncContext value={{ revision, error: key === "local" ? "" : error, wake, retry }}>
      {children}
    </SyncContext>
  );
}

export function useSync() {
  return useContext(SyncContext);
}
