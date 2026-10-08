import { Stack } from "expo-router";

/** The Observations tab's stack. The Contour observations screens replace the current index in Phase 8. */
export default function ObservationsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
