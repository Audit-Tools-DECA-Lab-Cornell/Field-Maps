import { z } from "zod";

const publicUrl = z.url().refine((value) => {
  const url = new URL(value);
  return (
    url.protocol === "https:" ||
    (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))
  );
}, "Use HTTPS, or localhost for simulator development.");
export const publicConfigSchema = z.object({
  apiUrl: publicUrl,
  supabaseUrl: publicUrl,
  publishableKey: z.string().refine((value) => {
    if (value.startsWith("sb_publishable_")) return true;
    try {
      const payload = value.split(".")[1];
      return (
        payload !== undefined &&
        z
          .object({ role: z.literal("anon") })
          .safeParse(JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")))).success
      );
    } catch (error) {
      if (error instanceof Error) return false;
      throw error;
    }
  }, "Use a public publishable or anon key; secret keys are forbidden."),
  powersyncUrl: publicUrl.nullable().default(null),
  bundleIdSuffix: z.string().regex(/^\.[a-zA-Z][a-zA-Z0-9.]*$/),
});
