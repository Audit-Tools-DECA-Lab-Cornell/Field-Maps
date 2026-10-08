import { Stack } from "expo-router";
import { useTheme } from "../../src/ui";

/** The tabs sit under collect and the Explain sheet, so back and a closed sheet return to them. */
export const unstable_settings = { initialRouteName: "(tabs)" };

/**
 * The signed-in, onboarded collector. The root layout opens this group only when the gate says the app
 * (an account with a finished observer profile).
 *
 * - `(tabs)`: Projects, Observations and Account behind the floating ink dock.
 * - `collect`: one route with its own internal steps (Place, Answer, Review, Saved). It sits outside
 *   the tabs, so the dock disappears while collecting. It fades in, and a swipe from the edge cannot
 *   leave it: leaving asks first ("Leave? Your draft stays on this device").
 * - `explain/[question]`: "Explain this question" as a native form sheet over collect.
 */
export default function AppLayout() {
  const { c } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.ground },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="collect" options={{ animation: "fade", gestureEnabled: false }} />
      <Stack.Screen
        name="explain/[question]"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.6, 1],
          sheetGrabberVisible: true,
          contentStyle: { backgroundColor: c.island },
        }}
      />
    </Stack>
  );
}
