import ky, { NetworkError, TimeoutError } from "ky";
import { readApiError } from "../data/api/errors";
import { legacyProjectId } from "../data/legacy/scope";
import { isShellObservation, type Observation } from "../domain/observation";
import { receiptSchema, type SyncScope, type UploadResult, uploadPayload } from "./contracts";

/** The project a record uploads to: the one it names, or the practice project for practice records. */
export function uploadProject(record: Observation): string | null {
  return isShellObservation(record) ? legacyProjectId : (record.projectId ?? null);
}

export async function uploadObservation(
  scope: SyncScope,
  apiUrl: string,
  record: Observation,
  token: string,
  signal: AbortSignal,
): Promise<UploadResult> {
  const projectId = uploadProject(record);
  if (projectId === null)
    return { kind: "rejected", message: "This record names no project to upload to." };
  const destination = { apiUrl, projectId };
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
    // ky wraps a dropped connection in NetworkError where it recognises the runtime's fetch failure
    // (React Native's "Network request failed" among them), and leaves the bare TypeError elsewhere.
    if (
      error instanceof NetworkError ||
      error instanceof TimeoutError ||
      error instanceof TypeError ||
      error instanceof SyntaxError
    )
      return {
        kind: "retry",
        message: "Connection interrupted. Your record is saved and will retry.",
      };
    throw error;
  }
}
