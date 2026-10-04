import { Stack } from "expo-router";
import { useTheme } from "../../src/ui";

/**
 * Onboarding (mobile-29 to 31): the observer identity, then joining a project. The root layout opens
 * this group only for a signed-in account without a finished profile.
 *
 * Invitation links: `fieldmaps://join/DECA2026` opens `join/[code]`, which shows the invitation once
 * the identity is saved (and the identity step first when it is not). `fieldmaps://join?code=DECA2026`
 * opens the join step with the code filled in. Both only work while onboarding: the group is guarded
 * once the app is open. Nothing is joined without the confirm screen.
 */
export const unstable_settings = { initialRouteName: "profile" };

export default function OnboardingLayout() {
  const { c } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.ground },
      }}
    >
      <Stack.Screen name="profile" />
      <Stack.Screen name="join/index" />
      <Stack.Screen name="join/[code]" options={{ animation: "none" }} />
      <Stack.Screen name="invitation/[code]" />
    </Stack>
  );
}
