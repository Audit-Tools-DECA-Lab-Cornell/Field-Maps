import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "../../auth/provider";
import { createApiClient } from "../../data/api/client";
import { ApiError } from "../../data/api/errors";
import { connection } from "../../platform/config";
import { useDataSource } from "../preview/data-source";
import {
  type Invitation,
  type InvitationLookup,
  invitationFromPreview,
  JOIN_CODE_LENGTH,
  type JoinFailure,
  joinCodeOf,
  joinFailure,
  previewLookup,
} from "./invitation";

/**
 * The join code calls (MOB-06). Device data asks the FieldMaps API with the signed-in account's token;
 * preview data reads the fixtures and sends nothing. Without a session (an offline start) a lookup says
 * joining needs a connection, and keeps the code.
 */

export type RedeemOutcome =
  | {
      ok: true;
      /** The project joined, to make active. Null for an organization invitation. */
      projectId: string | null;
    }
  | { ok: false; failure: JoinFailure };

/** Invitations looked up this session, so the confirm screen opens on what the join step found. */
const looked = new Map<string, Invitation>();
const lookedKey = (owner: string, code: string) => `${owner}:${code}`;

/** Any thrown value as a typed API error; an unexpected Error counts as no answer. */
function asApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof Error) return new ApiError("unknown", "retry");
  throw error;
}

export function useInvitations() {
  const { mode } = useDataSource();
  const { client, account, session, markAccountDeleted } = useAccount();
  const owner = account?.id ?? "local";
  const api = useMemo(() => {
    if (!client || !account || !session) return null;
    const id = account.id;
    return createApiClient(connection.apiUrl, async () => {
      const { data } = await client.auth.getSession();
      return data.session?.user.id === id ? data.session.access_token : null;
    });
  }, [client, account, session]);

  /** What a code opens without asking: preview fixtures, a lookup already made, or a short code. */
  const known = useCallback(
    (raw: string): InvitationLookup | null => {
      const code = joinCodeOf(raw);
      if (mode === "preview" || code.length !== JOIN_CODE_LENGTH) return previewLookup(code);
      const invitation = looked.get(lookedKey(owner, code));
      return invitation ? { status: "found", invitation } : null;
    },
    [mode, owner],
  );

  const fail = useCallback(
    (error: unknown, stage: "preview" | "redeem"): JoinFailure => {
      const failure = joinFailure(asApiError(error), stage);
      if (failure.kind === "deleted") markAccountDeleted();
      return failure;
    },
    [markAccountDeleted],
  );

  /** `POST /v1/invitations/preview`: what a code opens, without joining it. */
  const lookup = useCallback(
    async (raw: string, signal?: AbortSignal): Promise<InvitationLookup> => {
      const ready = known(raw);
      if (ready) return ready;
      const code = joinCodeOf(raw);
      try {
        if (!api) throw new ApiError("unauthenticated", "sign-in");
        const preview = await api.previewInvitation(code, signal ?? new AbortController().signal);
        const invitation = invitationFromPreview(code, preview);
        looked.set(lookedKey(owner, code), invitation);
        return { status: "found", invitation };
      } catch (error) {
        return { status: "failed", failure: fail(error, "preview") };
      }
    },
    [known, api, owner, fail],
  );

  /** `POST /v1/invitations/redeem`: joins what the code opens. Preview data joins nothing. */
  const redeem = useCallback(
    async (raw: string): Promise<RedeemOutcome> => {
      const code = joinCodeOf(raw);
      if (mode === "preview") return { ok: true, projectId: null };
      try {
        if (!api) throw new ApiError("unauthenticated", "sign-in");
        const joined = await api.redeemInvitation(code, new AbortController().signal);
        looked.delete(lookedKey(owner, code));
        return { ok: true, projectId: joined.project_id };
      } catch (error) {
        return { ok: false, failure: fail(error, "redeem") };
      }
    },
    [mode, api, owner, fail],
  );

  return { known, lookup, redeem };
}

/**
 * The invitation a code opens, for the confirm screen: at once from preview data or the join step's
 * lookup, otherwise asked for (an invitation link), with `retry` for another try.
 */
export function useInvitationLookup(code: string): {
  lookup: InvitationLookup | { status: "loading" };
  retry: () => void;
} {
  const { known, lookup } = useInvitations();
  const [attempt, setAttempt] = useState(0);
  const [fetched, setFetched] = useState<{ key: string; result: InvitationLookup } | null>(null);
  const ready = known(code);
  const mustAsk = ready === null;
  const key = `${code}#${attempt}`;

  useEffect(() => {
    if (!mustAsk) return;
    const controller = new AbortController();
    void lookup(code, controller.signal).then((result) => {
      if (!controller.signal.aborted) setFetched({ key, result });
    });
    return () => controller.abort();
  }, [mustAsk, lookup, code, key]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return {
    lookup: ready ?? (fetched?.key === key ? fetched.result : { status: "loading" }),
    retry,
  };
}
