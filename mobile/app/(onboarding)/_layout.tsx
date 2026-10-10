import { Stack } from "expo-router";
import { useTheme } from "../../src/ui";

/**
 * Onboarding (mobile-29 to 31): the observer identity, then joining a project. The root layout opens
 * this group only for a signed-in account without a finished profile.
 *
 * Invitation links: `decamark://join/DECA2026` opens `join/[code]`, which shows the invitation once
 * the identity is saved (and the identity step first when it is not). `decamark://join?code=DECA2026`
 * opens the join step with the code filled in. Both open here only while onboarding: the group is
 * guarded otherwise. A link opened while signed out, or once the app is open, still keeps its code on
 * this device (app/+native-intent.tsx): the auth screens say it is waiting, the profile step carries on
 * to it after sign-in, and Projects opens it in its own join screen. Nothing is joined without the
 * confirm screen.
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
