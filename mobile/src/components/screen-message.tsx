import { Text, View } from "react-native";
import { colors, space, textStyles } from "../theme";

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
        padding: space.wide,
        gap: space.snug,
        backgroundColor: colors.bg,
        flex: 1,
        justifyContent: "center",
      }}
    >
      <Text selectable style={[textStyles.title, { color: colors.text }]}>
        {title}
      </Text>
      <Text selectable style={[textStyles.body, { color: colors.neutral400 }]}>
        {detail}
      </Text>
    </View>
  );
}
