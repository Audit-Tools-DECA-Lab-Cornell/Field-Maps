import { Tabs } from "expo-router";
import { useQueue } from "../../../src/features/preview/data-source";
import { TabDock, useTheme } from "../../../src/ui";

/**
 * Projects, Observations and Account, each with its own stack, behind the floating ink dock (System 11):
 * 68 tall, centred, at most 420 wide, also on tablets. The Observations badge counts the records that
 * need attention (rejected by the server, with something to fix), and is hidden at zero.
 */
export default function TabsLayout() {
  const { c } = useTheme();
  const { counts } = useQueue();
  const attention = counts.attention;
  return (
    <Tabs
      tabBar={(props) => <TabDock {...props} />}
      screenOptions={{
        headerShown: false,
        // The dock floats over the content; every screen of a tab clears it with Screen `dock`.
        sceneStyle: { backgroundColor: c.ground },
      }}
    >
      <Tabs.Screen name="(projects)" options={{ title: "Projects" }} />
      <Tabs.Screen
        name="observations"
        options={{ title: "Observations", ...(attention > 0 ? { tabBarBadge: attention } : {}) }}
      />
      <Tabs.Screen name="account" options={{ title: "Account" }} />
    </Tabs>
  );
}
