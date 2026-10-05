import { Stack } from "expo-router";

/** The Account tab's stack. The Contour account screens replace the current index in Phase 8. */
export default function AccountLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
