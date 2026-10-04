import { Stack } from "expo-router";
import { useTheme } from "../../src/ui";

/** Welcome sits under any auth screen opened by a link, so back always has somewhere to go. */
export const unstable_settings = { initialRouteName: "welcome" };

/**
 * Welcome, sign in, create account, verify, and password recovery (Mobile 23–28). The root layout opens
 * this group while no account is signed in. Moving through it is moving forward and back, so it uses the
 * platform's own push and pop.
 */
export default function AuthLayout() {
  const { c } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "default",
        contentStyle: { backgroundColor: c.ground },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="create-account" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
