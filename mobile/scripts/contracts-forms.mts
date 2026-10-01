import { mkdir, writeFile } from "node:fs/promises";
import { z } from "zod";
import { formDefinitionSchema } from "../src/forms/definition.ts";

const directory = new URL("../../contracts/", import.meta.url);
await mkdir(directory, { recursive: true });
const schema = z.toJSONSchema(formDefinitionSchema, { io: "input" });
await writeFile(
  new URL("form-definition.schema.json", directory),
  `${JSON.stringify(schema, null, 2)}\n`,
);
