import { z } from "zod";

export const coordinateSchema = z.tuple([
  z.number().finite().min(-180).max(180),
  z.number().finite().min(-90).max(90),
]);

export const observationSchema = z.object({
  id: z.uuid(),
  siteId: z.literal("sample-garden"),
  formVersion: z.literal("shell-v1"),
  coordinates: coordinateSchema,
  observer: z.string().trim().min(1, "Enter your initials.").max(12),
  people: z.number().int().min(0).max(999),
  notes: z.string().trim().max(1000),
  createdAt: z.iso.datetime(),
  storageStatus: z.enum(["local-only", "pending", "synced", "needs-attention"]),
  syncError: z.string().default(""),
});

export type Observation = Readonly<z.infer<typeof observationSchema>>;
export type Coordinate = z.infer<typeof coordinateSchema>;

export const countInputSchema = z
  .string()
  .regex(/^\d{1,3}$/, "Enter a whole number from 0 to 999.")
  .transform(Number);
