import { readFileSync } from "node:fs";
import type { ExpoConfig } from "expo/config";
import { publicConfigSchema } from "./src/platform/config-schema.ts";

const environment = process.env["APP_ENV"] ?? "development";
if (!["development", "staging", "production"].includes(environment))
  throw new RangeError("Unknown APP_ENV");
const connection = publicConfigSchema.parse(
  JSON.parse(readFileSync(`${__dirname}/config/${environment}.json`, "utf8")),
);
const base = {
  name: "FieldMaps",
  slug: "fieldmaps-mobile",
  version: "0.1.1",
  scheme: "fieldmaps",
  orientation: "default",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.fieldmaps.collector.dev",
    requireFullScreen: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "com.fieldmaps.collector.dev",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      monochromeImage: "./assets/adaptive-icon-monochrome.png",
      backgroundColor: "#161826",
    },
    blockedPermissions: [
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.SYSTEM_ALERT_WINDOW",
    ],
  },
  platforms: ["ios", "android"],
  plugins: [
    "expo-router",
    "expo-sqlite",
    "@maplibre/maplibre-react-native",
    "expo-system-ui",
    "expo-secure-store",
    [
      "expo-screen-orientation",
      {
        initialOrientation: "DEFAULT",
      },
    ],
    "./plugins/with-large-screen-orientation",
  ],
  experiments: {
    typedRoutes: true,
  },
  backgroundColor: "#F0F3EC",
  extra: {
    router: {},
    eas: {
      projectId: "3b38a05c-e875-4ba6-a5df-eee550c22d5c",
    },
  },
} satisfies ExpoConfig;
export default {
  ...base,
  ios: { ...base.ios, bundleIdentifier: `com.fieldmaps.collector${connection.bundleIdSuffix}` },
  android: { ...base.android, package: `com.fieldmaps.collector${connection.bundleIdSuffix}` },
  // Expo turns null extras into objects; omit the unset endpoint and restore null at runtime.
  extra: {
    ...base.extra,
    environment,
    connection: { ...connection, powersyncUrl: connection.powersyncUrl ?? undefined },
  },
} satisfies ExpoConfig;
