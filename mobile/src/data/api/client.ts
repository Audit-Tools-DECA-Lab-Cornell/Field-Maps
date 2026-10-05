import ky, { NetworkError, TimeoutError } from "ky";
import type { z } from "zod";
import { ApiError, readApiError } from "./errors";
import {
  type Identity,
  type InvitationPreview,
  type InvitationRedeemed,
  identitySchema,
  invitationPreviewSchema,
  invitationRedeemedSchema,
  type Profile,
  type ProfilePatch,
  profileSchema,
} from "./identity";

type Method = "get" | "patch" | "post";

export function createApiClient(apiUrl: string, getToken: () => Promise<string | null>) {
  const http = ky.create({
    prefix: apiUrl.replace(/\/$/, ""),
    retry: 0,
    timeout: 10000,
    throwHttpErrors: false,
  });

  /**
   * One authenticated call: a Bearer token from the current session, a typed error for any failure
   * (CON-04), and a runtime check of the success body, which is never trusted unread.
   */
  async function request<T>(
    method: Method,
    path: string,
    schema: z.ZodType<T>,
    signal: AbortSignal,
    json?: unknown,
  ): Promise<T> {
    const token = await getToken();
    if (!token) throw new ApiError("unauthenticated", "sign-in");
    try {
      const response = await http[method](path, {
        signal,
        headers: { Authorization: `Bearer ${token}` },
        ...(json === undefined ? {} : { json }),
      });
      if (!response.ok) throw await readApiError(response);
      const parsed = schema.safeParse(await response.json<unknown>());
      if (!parsed.success) throw new ApiError("unknown", "retry");
      return parsed.data;
    } catch (error) {
      // No answer, or one that could not be read: ky wraps a dropped connection in NetworkError where it
      // recognises the runtime's fetch failure, and leaves the bare TypeError where it does not.
      if (
        error instanceof NetworkError ||
        error instanceof TimeoutError ||
        error instanceof TypeError ||
        error instanceof SyntaxError
      )
        throw new ApiError("unknown", "retry");
      throw error;
    }
  }

  return {
    me(signal: AbortSignal): Promise<Identity> {
      return request("get", "v1/me", identitySchema, signal);
    },
    /** `PATCH /v1/me`: the display name, observer initials or locale. Returns the saved profile. */
    updateProfile(patch: ProfilePatch, signal: AbortSignal): Promise<Profile> {
      return request("patch", "v1/me", profileSchema, signal, patch);
    },
    /** `POST /v1/invitations/preview`: what a join code opens, without joining. */
    previewInvitation(code: string, signal: AbortSignal): Promise<InvitationPreview> {
      return request("post", "v1/invitations/preview", invitationPreviewSchema, signal, { code });
    },
    /** `POST /v1/invitations/redeem`: joins the organization or project the code opens. */
    redeemInvitation(code: string, signal: AbortSignal): Promise<InvitationRedeemed> {
      return request("post", "v1/invitations/redeem", invitationRedeemedSchema, signal, { code });
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
