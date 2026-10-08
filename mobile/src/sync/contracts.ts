import { z } from "zod";
import type { components } from "../data/api/schema";
import { isShellObservation, type Observation } from "../domain/observation";

export const syncScopeSchema = z.object({
  apiUrl: z.url(),
  issuer: z.url(),
  userId: z.uuid().brand<"UserId">(),
  projectId: z.uuid().brand<"ProjectId">(),
});
export type SyncScope = Readonly<z.infer<typeof syncScopeSchema>>;

export function scopeKey(scope: SyncScope): string {
  return JSON.stringify([scope.apiUrl, scope.issuer, scope.userId, scope.projectId]);
}

export const receiptSchema = z.object({
  observation_id: z.uuid(),
  project_id: z.uuid(),
  user_id: z.uuid(),
  accepted_revision: z.literal(1),
  received_at: z.iso.datetime({ offset: true }),
});
export type Receipt = Readonly<components["schemas"]["UploadReceipt"]>;

/**
 * The upload body for a record. The practice form's three fields go at the top level, exactly as they
 * always have. An instrument record sends its round context in the envelope (D26) and every answer
 * beside it under its question id, which the API checks against the published form version.
 */
export function uploadPayload(record: Observation): Record<string, unknown> {
  if (isShellObservation(record))
    return {
      site_id: record.siteId,
      form_version: record.formVersion,
      coordinates: record.coordinates,
      observer: record.observer,
      people: record.people,
      notes: record.notes,
      observed_at: record.createdAt,
    };
  return {
    ...record.answers,
    site_id: record.siteId,
    form_version: record.formVersion,
    coordinates: record.coordinates,
    observer: record.observer,
    observed_at: record.createdAt,
    zone: record.context.zoneId,
    round_type: record.context.roundType,
    // First_Round answers for play events only; an inventory belongs to the zone, not a period.
    ...(record.context.roundType === "inventory"
      ? {}
      : { first_round: record.context.freshPeriod }),
    placement: record.placement.source,
  };
}

export type UploadResult =
  | { readonly kind: "accepted"; readonly receipt: Receipt }
  | { readonly kind: "retry" | "rejected" | "sign-in"; readonly message: string };

export type Upload = (
  record: Observation,
  token: string,
  signal: AbortSignal,
) => Promise<UploadResult>;
