import type { BottomTabBarProps } from "expo-router/tabs";
import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Icon, type IconName } from "./Icon";
import { Text } from "./Text";
import { type Theme, useStyles, useTheme } from "./theme";

type TabSpec = { icon: IconName; label: string };

/** The collector's three tabs. Any other route still gets a tab, named by its title. */
const TABS: Readonly<Record<string, TabSpec>> = {
  projects: { icon: "map", label: "Projects" },
  observations: { icon: "list", label: "Observations" },
  account: { icon: "user", label: "Account" },
};

/** `(projects)`, `projects/index` and `projects` all name the Projects tab. */
export function tabKey(routeName: string): string {
  const first = routeName.split("/")[0] ?? routeName;
  return first.replace(/^\(|\)$/g, "");
}

/** The icon glyph above the label. */
const ICON_SIZE = 22;
/** The attention badge on a tab icon, drawn to the design. */
const BADGE = 18;

/**
 * The floating ink dock for expo-router `Tabs` (`tabBar={(props) => <TabDock {...props} />}`):
 * Projects, Observations, Account. The current tab is a white pill that slides between tabs; the
 * Observations badge counts records that need attention (`tabBarBadge`). It floats over content,
 * so screens under it add bottom space (Screen `dock`), and steps aside while the keyboard is up.
 */
export function TabDock({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const reduceMotion = useReducedMotion();
  const keyboardShown = useKeyboardShown();
  const [width, setWidth] = useState(0);

  // `href: null` in expo-router hides a route from the tab bar with display: none.
  const routes = state.routes.filter((route) => {
    const itemStyle = StyleSheet.flatten(descriptors[route.key]?.options.tabBarItemStyle);
    return itemStyle?.display !== "none";
  });
  const focusedKey = state.routes[state.index]?.key;
  // A focused route that has no tab (href: null) leaves every tab unlit.
  const index = routes.findIndex((route) => route.key === focusedKey);
  const count = Math.max(routes.length, 1);
  const inset = theme.space.s1;
  const inner = width - inset * 2;
  const segment = inner > 0 ? inner / count : 0;

  const x = useSharedValue(0);
  const placedSegment = useRef(0);
  useEffect(() => {
    const target = Math.max(index, 0) * segment;
    if (placedSegment.current !== segment || reduceMotion) {
      placedSegment.current = segment;
      x.set(target);
      return;
    }
    x.set(
      withTiming(target, {
        duration: theme.motion.duration.slide,
        easing: theme.motion.easing.standard,
      }),
    );
  }, [index, segment, reduceMotion, x, theme.motion]);
  const pillMotion = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  if (keyboardShown) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.anchor,
        {
          paddingBottom: Math.max(insets.bottom, theme.space.s3),
          paddingLeft: theme.layout.gutter + insets.left,
          paddingRight: theme.layout.gutter + insets.right,
        },
      ]}
    >
      <View
        accessibilityRole="tablist"
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        style={styles.dock}
      >
        {segment > 0 && index >= 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.pill, { width: segment, left: inset }, pillMotion]}
          />
        ) : null}
        {routes.map((route, position) => {
          const options = descriptors[route.key]?.options;
          const focused = route.key === focusedKey;
          const spec = TABS[tabKey(route.name)];
          const label =
            spec?.label ??
            options?.title ??
            (typeof options?.tabBarLabel === "string" ? options.tabBarLabel : undefined) ??
            tabKey(route.name);
          const badge = badgeText(options?.tabBarBadge);
          const color = focused ? theme.c.onNavCurrent : theme.c.onNav;
          const spokenBadge = badge
            ? tabKey(route.name) === "observations"
              ? `, ${badge} need attention`
              : `, ${badge}`
            : "";
          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented)
                  navigation.navigate(route.name, route.params);
              }}
              onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
              accessibilityRole="tab"
              accessibilityLabel={
                options?.tabBarAccessibilityLabel ??
                `${label}${spokenBadge}, tab, ${position + 1} of ${routes.length}`
              }
              accessibilityState={{ selected: focused }}
              testID={options?.tabBarButtonTestID}
              style={({ pressed }) => [
                styles.tab,
                focused && segment === 0 ? styles.tabCurrent : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={styles.glyph}>
                {spec ? (
                  <Icon name={spec.icon} size={ICON_SIZE} color={color} />
                ) : options?.tabBarIcon ? (
                  options.tabBarIcon({ focused, color, size: ICON_SIZE })
                ) : (
                  <Icon name="ellipsis" size={ICON_SIZE} color={color} />
                )}
                {badge ? (
                  <View style={styles.badge}>
                    <Text variant="monoLabel" style={styles.badgeText}>
                      {badge}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text variant="smallStrong" tone={focused ? "onNavCurrent" : "onNav"} align="center">
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function badgeText(badge: number | string | undefined): string | undefined {
  if (badge === undefined || badge === "") return undefined;
  if (typeof badge === "number")
    return badge > 0 ? (badge > 99 ? "99+" : String(badge)) : undefined;
  return badge;
}

/** True while the software keyboard covers the bottom of the screen. */
function useKeyboardShown(): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const show = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hide = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const subscriptions = [
      Keyboard.addListener(show, () => setShown(true)),
      Keyboard.addListener(hide, () => setShown(false)),
    ];
    return () => {
      for (const subscription of subscriptions) subscription.remove();
    };
  }, []);
  return shown;
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    anchor: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
    },
    dock: {
      flexDirection: "row",
      width: "100%",
      maxWidth: t.layout.dockMaxWidth,
      minHeight: t.layout.dockHeight,
      padding: t.space.s1,
      borderRadius: t.radius.pill,
      backgroundColor: t.c.nav,
    },
    pill: {
      position: "absolute",
      top: t.space.s1,
      bottom: t.space.s1,
      borderRadius: t.radius.pill,
      backgroundColor: t.c.navCurrent,
    },
    tab: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: t.space.s1,
      minHeight: t.layout.dockHeight - t.space.s1 * 2,
      paddingHorizontal: t.space.s1,
      paddingVertical: t.space.s1,
      borderRadius: t.radius.pill,
    },
    tabCurrent: { backgroundColor: t.c.navCurrent },
    pressed: { opacity: 0.88 },
    glyph: { position: "relative" },
    badge: {
      position: "absolute",
      top: -t.space.s1,
      left: ICON_SIZE - t.space.s1,
      minWidth: BADGE,
      minHeight: BADGE,
      paddingHorizontal: t.space.s1,
      borderRadius: t.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.c.attention,
    },
    badgeText: { color: t.c.onAttention },
  });
}
