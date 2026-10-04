import Constants from "expo-constants";
import { publicConfigSchema } from "./config-schema";
export const connection = publicConfigSchema.parse(Constants.expoConfig?.extra?.["connection"]);
