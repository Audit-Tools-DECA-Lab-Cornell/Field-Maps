import { z } from "zod";

const accountSchema = z.object({ id: z.uuid(), email: z.string().optional() });
export type CachedAccount = Readonly<z.infer<typeof accountSchema>>;

export function cachedAccount(value: string | null): CachedAccount | null {
  if (!value) return null;
  try {
    const parsed = z.object({ user: accountSchema }).safeParse(JSON.parse(value));
    return parsed.success ? parsed.data.user : null;
  } catch {
    return null;
  }
}
