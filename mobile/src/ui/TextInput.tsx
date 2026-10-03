import { type ReactNode, type Ref, useState } from "react";
import {
  TextInput as NativeTextInput,
  type TextInputProps as NativeTextInputProps,
  StyleSheet,
  View,
} from "react-native";
import { useField } from "./Field";
import { Icon } from "./Icon";
import { type Theme, useStyles, useTheme } from "./theme";

type FocusEvent = Parameters<NonNullable<NativeTextInputProps["onFocus"]>>[0];
type BlurEvent = Parameters<NonNullable<NativeTextInputProps["onBlur"]>>[0];

export type TextInputProps = Omit<
  NativeTextInputProps,
  "editable" | "readOnly" | "placeholderTextColor" | "numberOfLines" | "selectionColor"
> & {
  /** Draws the attention border. Inside a Field with an error this is already on. */
  invalid?: boolean | undefined;
  /** Shown, not editable: well fill, light border and a lock. */
  readOnly?: boolean | undefined;
  /** The mono face, for identifiers such as `age_range`. */
  mono?: boolean | undefined;
  /** Something inside the field on the right, such as PasswordInput's Show. */
  trailing?: ReactNode | undefined;
  ref?: Ref<NativeTextInput> | undefined;
};

/**
 * The Contour text field: 54 tall, radius 14, a 2 px ink border on the island fill. Focus adds the
 * 3 px ink ring with a 3 px gap outside the border, so nothing inside moves. Text grows with the
 * device text size and the field grows with it.
 */
export function TextInput({
  invalid,
  readOnly,
  mono,
  trailing,
  multiline,
  style,
  onFocus,
  onBlur,
  accessibilityLabel,
  accessibilityHint,
  maxFontSizeMultiplier,
  ref,
  ...rest
}: TextInputProps) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const field = useField();
  const [focused, setFocused] = useState(false);
  const showInvalid = invalid ?? field?.invalid ?? false;
  const c = theme.c;

  const textStyle = mono ? theme.type.monoData : theme.type.answer;
  // A line height on a single-line native input pushes the text off centre on iOS.
  const { lineHeight: _lineHeight, ...singleLine } = textStyle;

  return (
    <View style={styles.wrap}>
      {focused && !readOnly ? <View pointerEvents="none" style={styles.ring} /> : null}
      <View
        style={[
          styles.box,
          multiline ? styles.boxMultiline : null,
          showInvalid ? styles.boxInvalid : null,
          readOnly ? styles.boxReadOnly : null,
        ]}
      >
        <NativeTextInput
          ref={ref}
          {...rest}
          multiline={multiline}
          editable={!readOnly}
          accessibilityLabel={accessibilityLabel ?? field?.label}
          accessibilityHint={accessibilityHint ?? field?.hint}
          maxFontSizeMultiplier={maxFontSizeMultiplier ?? (mono ? 2 : 1.8)}
          placeholderTextColor={c.ink2}
          selectionColor={c.accent}
          cursorColor={c.ink}
          onFocus={(event: FocusEvent) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event: BlurEvent) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[styles.input, multiline ? textStyle : singleLine, { color: c.ink }, style]}
        />
        {readOnly && !trailing ? (
          <View style={styles.lock}>
            <Icon name="lock" color={c.ink2} />
          </View>
        ) : (
          trailing
        )}
      </View>
    </View>
  );
}

function makeStyles(t: Theme) {
  const ring = t.size.focusRing;
  // The ring sits outside the border: ring width plus an equal gap.
  const outset = ring * 2;
  return StyleSheet.create({
    wrap: { position: "relative" },
    ring: {
      position: "absolute",
      top: -outset,
      left: -outset,
      right: -outset,
      bottom: -outset,
      borderRadius: t.radius.input + outset,
      borderWidth: ring,
      borderColor: t.c.focus,
      backgroundColor: t.c.focusGap,
    },
    box: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: t.size.tileBorder,
      borderColor: t.c.ink,
      borderRadius: t.radius.input,
      backgroundColor: t.c.island,
      overflow: "hidden",
    },
    boxMultiline: { alignItems: "stretch" },
    boxInvalid: { borderColor: t.c.attention },
    boxReadOnly: {
      borderWidth: t.size.border,
      borderColor: t.c.line,
      backgroundColor: t.c.well,
      // Keeps the text where it sits in an editable field despite the thinner border.
      padding: t.size.tileBorder - t.size.border,
    },
    input: {
      flex: 1,
      minHeight: t.size.input - t.size.tileBorder * 2,
      paddingHorizontal: t.space.s4,
      paddingVertical: t.space.s2,
    },
    lock: {
      minHeight: t.size.input - t.size.tileBorder * 2,
      justifyContent: "center",
      paddingRight: t.space.s4,
    },
  });
}
