import type { PropsWithChildren } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLayout } from "../layout/use-layout";
import { useFieldSession } from "../session/provider";
import { colors, space } from "../theme";
import { ScreenFooter } from "./chrome";

/**
 * Every screen is full-bleed with its own back affordance: no navigation bar competes with the
 * map for height, and the last thing that happened stays readable along the bottom edge.
 */
export function Screen({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const { status } = useFieldSession();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        paddingTop: insets.top,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <View style={{ flex: 1, minHeight: 0 }}>{children}</View>
      <ScreenFooter>{status}</ScreenFooter>
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

/** A reading screen: left-aligned, hugging the left edge, with whitespace kept on the right. */
export function PageScreen({ children }: PropsWithChildren) {
  const layout = useLayout();
  return (
    <Screen>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: space.loose,
          paddingTop: space.base,
          paddingBottom: space.wide,
          width: "100%",
          maxWidth: layout.wide ? 620 : undefined,
        }}
      >
        {children}
      </ScrollView>
    </Screen>
  );
}
