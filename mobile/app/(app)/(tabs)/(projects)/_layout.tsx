import { Stack } from "expo-router";
import { useTheme } from "../../../../src/ui";

export const unstable_settings = { initialRouteName: "index" };

/**
 * The Projects tab (Mobile 10 to 14): the joined projects, a project's sites, a site's package, and
 * "Before you begin". Each step pushes on the platform's own stack; the dock stays.
 */
export default function ProjectsLayout() {
  const { c } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.ground } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[project]" />
      <Stack.Screen name="[project]/[site]" />
      <Stack.Screen name="[project]/[site]/brief" />
      <Stack.Screen name="join-project" />
    </Stack>
  );
}
