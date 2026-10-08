import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { FieldFooter, useFieldCounter } from "./Field";
import { TextInput, type TextInputProps } from "./TextInput";
import { type Theme, useStyles, useTheme } from "./theme";

export type TextareaProps = Omit<TextInputProps, "multiline" | "trailing" | "mono"> & {
  /** Visible lines before the field grows. */
  rows?: number | undefined;
  /** Shows "69 / 1000" under the field (in the Field's line when there is one). */
  showCount?: boolean | undefined;
};

const DEFAULT_ROWS = 4;

/** A multi-line answer. Counts characters against maxLength: "69 / 1000". */
export function Textarea({
  rows = DEFAULT_ROWS,
  showCount = true,
  maxLength,
  value,
  defaultValue,
  onChangeText,
  style,
  ...rest
}: TextareaProps) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const [typedLength, setTypedLength] = useState(defaultValue?.length ?? 0);
  const length = value !== undefined ? value.length : typedLength;
  const counter = showCount && maxLength !== undefined ? `${length} / ${maxLength}` : undefined;
  const inField = useFieldCounter(counter, false);
  const minHeight = theme.space.s4 * 2 + rows * (theme.type.answer.lineHeight ?? 0);

  return (
    <View style={styles.wrap}>
      <TextInput
        {...rest}
        multiline
        textAlignVertical="top"
        scrollEnabled={false}
        maxLength={maxLength}
        value={value}
        defaultValue={defaultValue}
        onChangeText={(text) => {
          setTypedLength(text.length);
          onChangeText?.(text);
        }}
        style={[styles.text, { minHeight }, style]}
      />
      {!inField && counter ? <FieldFooter counter={{ text: counter, complete: false }} /> : null}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    wrap: { gap: t.space.s2 },
    text: { paddingTop: t.space.s4, paddingBottom: t.space.s4 },
  });
}
