import { router } from "expo-router";
import type { BottomTabBarProps } from "expo-router/tabs";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TabDock } from "../../ui";
import { useQueue } from "../preview/data-source";

/** The three tabs, by the route names the dock knows them by. */
const ROUTES = [
  { key: "static-projects", name: "(projects)", href: "/" },
  { key: "static-observations", name: "observations", href: "/observations" },
  { key: "static-account", name: "account", href: "/account" },
] as const;

/**
 * The tab dock on a screen outside the tabs (the 404, Mobile 22): the same floating ink dock with no tab
 * lit, whose tabs navigate into the app. It hands TabDock only the props it reads.
 */
export function StaticDock() {
  const insets = useSafeAreaInsets();
  const { counts } = useQueue();
  const props = {
    state: {
      key: "static-dock",
      // No tab is current here.
      index: -1,
      routes: ROUTES,
      routeNames: ROUTES.map((route) => route.name),
      type: "tab",
      stale: false,
      history: [],
      preloadedRouteKeys: [],
    },
    descriptors: {
      "static-projects": { options: {} },
      "static-observations": {
        options: counts.attention > 0 ? { tabBarBadge: counts.attention } : {},
      },
      "static-account": { options: {} },
    },
    navigation: {
      emit: () => ({ defaultPrevented: false }),
      navigate: (name: string) => {
        const route = ROUTES.find((entry) => entry.name === name);
        if (route) router.replace(route.href);
      },
    },
    insets,
  } as unknown as BottomTabBarProps;
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
      <TabDock {...props} />
    </View>
  );
}
