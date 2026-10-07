import { z } from "zod";
import { roundTypeSchema } from "./rounds";

export const coordinateSchema = z.tuple([
  z.number().finite().min(-180).max(180),
  z.number().finite().min(-90).max(90),
]);
export type Coordinate = z.infer<typeof coordinateSchema>;

/**
 * The real queue states. The Field screen speaks of records being "held" rather than pending,
 * but the stored value stays the enum the API and the SQLite schema already agree on.
 */
export const storageStatusSchema = z.enum(["local-only", "pending", "synced", "needs-attention"]);
export type StorageStatus = z.infer<typeof storageStatusSchema>;

const identity = {
  id: z.uuid(),
  coordinates: coordinateSchema,
  createdAt: z.iso.datetime(),
  storageStatus: storageStatusSchema,
  syncError: z.string().default(""),
};

/**
 * The practice form, unchanged. Records written before the collector redesign parse through
 * this branch exactly as they did, and their upload payload is byte-for-byte the same.
 */
export const shellObservationSchema = z.object({
  ...identity,
  siteId: z.literal("sample-garden"),
  formVersion: z.literal("shell-v1"),
  observer: z.string().trim().min(1, "Enter your initials.").max(12),
  people: z.number().int().min(0).max(999),
  notes: z.string().trim().max(1000),
});
export type ShellObservation = Readonly<z.infer<typeof shellObservationSchema>>;

export const answerValueSchema = z.union([z.string(), z.number().finite(), z.array(z.string())]);

/** What the site brief fixes for a round and stamps onto every observation inside it. */
export const roundContextSchema = z.object({
  packageId: z.string().min(1),
  packageVersion: z.string().min(1),
  zoneId: z.string().min(1),
  zoneLabel: z.string().min(1),
  /**
   * Standard, Reliability or Inventory (`domain/rounds.ts`). Drafts and records saved before round
   * types existed carry a round number instead and read as Standard.
   */
  roundType: roundTypeSchema.default("standard"),
  /** The numbered round of drafts and records saved before round types. Never written now. */
  round: z.number().int().min(1).optional(),
  /**
   * True when the observer marked this the first round of an observation period (the workbook's
   * First_Round), so nothing is inherited from an earlier round.
   */
  freshPeriod: z.boolean(),
  inheritedFrom: z.string(),
});
export type RoundContext = Readonly<z.infer<typeof roundContextSchema>>;

/**
 * Hand placement is the record. A device fix never overwrites the coordinates the observer
 * tapped; its accuracy is kept beside them. It is null while this build has no location
 * permission, rather than filled with a plausible number.
 */
export const placementSchema = z.object({
  /**
   * `hand`: the observer put the point where the play happened. `zone`: a whole-zone record (an
   * inventory) stored at the zone's centre; no point was placed, and none should be read into it.
   */
  source: z.enum(["hand", "zone"]),
  gpsAccuracyMetres: z.number().nonnegative().nullable(),
});
export type Placement = Readonly<z.infer<typeof placementSchema>>;

/** Any versioned instrument: `janet-test-v1`, `janet-inventory-v1`, or a version a project publishes. */
const instrumentVersionSchema = z
  .string()
  .min(1)
  .refine((version) => version !== "shell-v1", "The practice form has its own record shape.");

export const instrumentObservationSchema = z.object({
  ...identity,
  siteId: z.string().min(1),
  formVersion: instrumentVersionSchema,
  observer: z.string().trim().min(1).max(10),
  answers: z.record(z.string(), answerValueSchema),
  context: roundContextSchema,
  placement: placementSchema,
});
export type InstrumentObservation = Readonly<z.infer<typeof instrumentObservationSchema>>;

export const observationSchema = z.union([shellObservationSchema, instrumentObservationSchema]);
export type Observation = ShellObservation | InstrumentObservation;

export const countInputSchema = z
  .string()
  .regex(/^\d{1,3}$/, "Enter a whole number from 0 to 999.")
  .transform(Number);

/** The practice form's record, told apart from every instrument record by its version. */
export function isShellObservation(record: Observation): record is ShellObservation {
  return record.formVersion === "shell-v1";
}
