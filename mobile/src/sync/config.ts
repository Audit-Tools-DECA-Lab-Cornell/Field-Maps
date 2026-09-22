import { z } from "zod";
import configuration from "../../connection.config.json";

const apiUrl = z.url().refine((value) => {
  const url = new URL(value);
  return (
    url.protocol === "https:" ||
    (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))
  );
}, "Use HTTPS, or localhost for simulator development.");

const schema = z.object({
  connection: z
    .object({
      apiUrl,
      supabaseUrl: z.url().refine((value) => new URL(value).protocol === "https:"),
      publishableKey: z.string().startsWith("sb_publishable_"),
      projectId: z.uuid(),
    })
    .nullable(),
});

export const connection = schema.parse(configuration).connection;
