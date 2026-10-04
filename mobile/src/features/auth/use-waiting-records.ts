import { useAccount } from "../../auth/provider";
import { PREVIEW_ACCOUNT, useDataSource, useQueue } from "../preview";

export type WaitingRecords = {
  /** Records on this device the server has not acknowledged. */
  count: number;
  /** The account they belong to, as the notes name it. */
  owner: string;
  /** The owner's email, when it is known, to fill in on sign-in. */
  email: string | undefined;
};

/**
 * The records waiting on this device for a signed-out account, which the welcome, sign-in and recovery
 * screens name (Mobile 23, 24, 27). Preview shows the designed five for p.sudhakar@example.org. On the
 * device they show only when an account is remembered here: the queue is scoped to that account, so the
 * count and the owner always agree. Null when nothing is waiting.
 */
export function useWaitingRecords(): WaitingRecords | null {
  const { mode } = useDataSource();
  const queue = useQueue();
  const { account } = useAccount();
  if (mode === "preview") {
    return queue.unsent > 0
      ? { count: queue.unsent, owner: PREVIEW_ACCOUNT.email, email: PREVIEW_ACCOUNT.email }
      : null;
  }
  if (!account || queue.loading || queue.unsent === 0) return null;
  return {
    count: queue.unsent,
    owner: account.email ?? "the account last signed in on this device",
    email: account.email,
  };
}
