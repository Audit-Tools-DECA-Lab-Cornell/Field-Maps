import ky, { TimeoutError } from "ky";
import type { Observation } from "../domain/observation";
import { receiptSchema, type SyncScope, type UploadResult, uploadPayload } from "./contracts";

export async function uploadObservation(
  scope: SyncScope,
  record: Observation,
  token: string,
  signal: AbortSignal,
): Promise<UploadResult> {
  try {
    const response = await ky.put(
      `${scope.apiUrl}/v1/projects/${scope.projectId}/observations/${record.id}`,
      {
        json: uploadPayload(record),
        headers: { Authorization: `Bearer ${token}` },
        signal,
        retry: 0,
        timeout: 10000,
        throwHttpErrors: false,
      },
    );
    if (response.status === 401)
      return { kind: "sign-in", message: "Sign in again to synchronize." };
    if (response.status === 408 || response.status === 429 || response.status >= 500)
      return { kind: "retry", message: "Server unavailable. Your record is saved and will retry." };
    if (response.status !== 200)
      return {
        kind: "rejected",
        message:
          response.status === 409
            ? "A different upload already uses this record ID. Your local record is preserved."
            : "The server could not accept this record. Check project access and form values.",
      };
    const receipt = receiptSchema.safeParse(await response.json<unknown>());
    if (!receipt.success)
      return { kind: "retry", message: "The server receipt could not be verified." };
    if (
      receipt.data.observation_id !== record.id ||
      receipt.data.project_id !== scope.projectId ||
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
