import { Redirect, Stack } from "expo-router";
import { PREVIEW_ALLOWED } from "../../src/features/preview/data-source";
import { useTheme } from "../../src/ui/theme";

/**
 * Review-only routes, such as the Contour gallery (decamark://gallery). They open in development builds
 * and in builds made for review (EXPO_PUBLIC_PREVIEW_TOOLS=1); a release build has no use for them, so
 * any link into this group goes back to the start.
 */
export default function DevLayout() {
  const { c } = useTheme();
  if (!PREVIEW_ALLOWED) return <Redirect href="/" />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.ground },
        animation: "none",
      }}
    />
  );
}
