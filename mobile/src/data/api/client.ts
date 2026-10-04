import ky, { TimeoutError } from "ky";
import { ApiError, readApiError } from "./errors";
import { type Identity, identitySchema } from "./identity";

export function createApiClient(apiUrl: string, getToken: () => Promise<string | null>) {
  const http = ky.create({
    prefix: apiUrl.replace(/\/$/, ""),
    retry: 0,
    timeout: 10000,
    throwHttpErrors: false,
  });
  return {
    async me(signal: AbortSignal): Promise<Identity> {
      const token = await getToken();
      if (!token) throw new ApiError("unauthenticated", "sign-in");
      try {
        const response = await http.get("v1/me", {
          signal,
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw await readApiError(response);
        const parsed = identitySchema.safeParse(await response.json<unknown>());
        if (!parsed.success) throw new ApiError("unknown", "retry");
        return parsed.data;
      } catch (error) {
        if (
          error instanceof TimeoutError ||
          error instanceof TypeError ||
          error instanceof SyntaxError
        )
          throw new ApiError("unknown", "retry");
        throw error;
      }
    },
  };
}
