import { Pressable, Text } from "react-native";
import { colors } from "../theme";

type Props = {
  readonly label: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
  readonly secondary?: boolean;
};

export function ActionButton({ label, onPress, disabled = false, secondary = false }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: secondary ? colors.soft : colors.accent,
        opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
      })}
    >
      <Text style={{ color: secondary ? colors.ink : "white", fontSize: 16, fontWeight: "600" }}>
        {label}
      </Text>
    </Pressable>
  );
}
