import ky, { TimeoutError } from "ky";
import { readApiError } from "../data/api/errors";
import type { ShellObservation } from "../domain/observation";
import { receiptSchema, type SyncScope, type UploadResult, uploadPayload } from "./contracts";

export async function uploadObservation(
  scope: SyncScope,
  destination: { readonly apiUrl: string; readonly projectId: string },
  record: ShellObservation,
  token: string,
  signal: AbortSignal,
): Promise<UploadResult> {
  try {
    const response = await ky.put(
      `${destination.apiUrl}/v1/projects/${destination.projectId}/observations/${record.id}`,
      {
        json: uploadPayload(record),
        headers: { Authorization: `Bearer ${token}` },
        signal,
        retry: 0,
        timeout: 10000,
        throwHttpErrors: false,
      },
    );
    if (!response.ok) {
      const error = await readApiError(response);
      return { kind: error.kind, message: error.message };
    }
    const receipt = receiptSchema.safeParse(await response.json<unknown>());
    if (!receipt.success)
      return { kind: "retry", message: "The server receipt could not be verified." };
    if (
      receipt.data.observation_id !== record.id ||
      receipt.data.project_id !== destination.projectId ||
      receipt.data.user_id !== scope.userId
    )
      return {
        kind: "rejected",
        message: "The server receipt belongs to a different record or account.",
      };
    return { kind: "accepted", receipt: receipt.data };
  } catch (error) {
    if (error instanceof TimeoutError || error instanceof TypeError || error instanceof SyntaxError)
      return {
        kind: "retry",
        message: "Connection interrupted. Your record is saved and will retry.",
      };
    throw error;
  }
}
