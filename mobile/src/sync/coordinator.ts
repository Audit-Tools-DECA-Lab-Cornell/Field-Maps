import type { LocalDatabase } from "../storage/observation-store";
import { acknowledge, deferObservation, pendingObservations } from "../storage/sync-store";
import { type SyncScope, scopeKey, type Upload } from "./contracts";

type Options = {
  readonly database: LocalDatabase;
  readonly scope: SyncScope;
  readonly getToken: () => Promise<string | null>;
  readonly isCurrent: () => boolean;
  readonly upload: Upload;
  readonly now?: () => number;
};

function assertNever(value: never): never {
  throw new TypeError(`Unexpected synchronization outcome: ${String(value)}`);
}

export function createSyncCoordinator(options: Options) {
  let running = false;
  const now = options.now ?? Date.now;
  const key = scopeKey(options.scope);
  return async (signal: AbortSignal): Promise<void> => {
    if (running || signal.aborted || !options.isCurrent()) return;
    running = true;
    try {
      const pending = await pendingObservations(options.database, key, now());
      for (const item of pending) {
        if (signal.aborted || !options.isCurrent()) return;
        const token = await options.getToken();
        if (!token || signal.aborted || !options.isCurrent()) return;
        const result = await options.upload(item.record, token, signal);
        if (signal.aborted || !options.isCurrent()) return;
        switch (result.kind) {
          case "accepted":
            await acknowledge(options.database, key, result.receipt);
            break;
          case "rejected":
          case "retry":
          case "sign-in":
            await deferObservation(
              options.database,
              key,
              item.record.id,
              result.message,
              now() + Math.min(300000, 5000 * 2 ** Math.min(item.attempts, 6)),
              result.kind === "rejected",
            );
            if (result.kind === "sign-in") return;
            break;
          default:
            assertNever(result);
        }
      }
    } finally {
      running = false;
    }
  };
}
