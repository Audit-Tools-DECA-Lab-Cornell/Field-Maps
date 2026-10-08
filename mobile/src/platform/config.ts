import Constants from "expo-constants";
import { publicConfigSchema } from "./config-schema";
export const connection = publicConfigSchema.parse(
  // biome-ignore lint/complexity/useLiteralKeys: `extra` is an index signature, which noPropertyAccessFromIndexSignature reads only in brackets.
  Constants.expoConfig?.extra?.["connection"],
);
