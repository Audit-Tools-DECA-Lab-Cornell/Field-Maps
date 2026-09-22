import { Text, View } from "react-native";
import { colors } from "../theme";

export function ScreenMessage({
  title,
  detail,
}: {
  readonly title: string;
  readonly detail: string;
}) {
  return (
    <View
      style={{
        padding: 24,
        gap: 8,
        backgroundColor: colors.canvas,
        flex: 1,
        justifyContent: "center",
      }}
    >
      <Text selectable style={{ fontSize: 23, fontWeight: "600", color: colors.ink }}>
        {title}
      </Text>
      <Text selectable style={{ fontSize: 16, lineHeight: 24, color: colors.muted }}>
        {detail}
      </Text>
    </View>
  );
}
