import { useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { Text } from "./Text";
import { TextInput, type TextInputProps } from "./TextInput";
import { type Theme, useStyles } from "./theme";

type PasswordInputProps = Omit<TextInputProps, "secureTextEntry" | "trailing" | "multiline"> & {
  /** A password being chosen: the system offers a strong one and saves it. */
  newPassword?: boolean | undefined;
};

/** A text field that hides what is typed until the observer taps Show. */
export function PasswordInput({ newPassword, ...rest }: PasswordInputProps) {
  const styles = useStyles(makeStyles);
  const [shown, setShown] = useState(false);
  return (
    <TextInput
      autoCapitalize="none"
      autoCorrect={false}
      spellCheck={false}
      autoComplete={newPassword ? "new-password" : "current-password"}
      textContentType={newPassword ? "newPassword" : "password"}
      {...rest}
      secureTextEntry={!shown}
      trailing={
        <Pressable
          onPress={() => setShown((current) => !current)}
          accessibilityRole="switch"
          accessibilityLabel="Show password"
          accessibilityState={{ checked: shown }}
          style={({ pressed }) => [styles.toggle, pressed ? styles.pressed : null]}
        >
          <Text variant="bodyStrong" tone="accent">
            {shown ? "Hide" : "Show"}
          </Text>
        </Pressable>
      }
    />
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    toggle: {
      minHeight: t.size.touch,
      minWidth: t.size.touch,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: t.space.s4,
    },
    pressed: { opacity: 0.88 },
  });
}
