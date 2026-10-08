import { StyleSheet, View } from "react-native";
import { FieldFooter, useFieldCounter } from "./Field";
import { TextInput, type TextInputProps } from "./TextInput";
import { type Theme, useStyles } from "./theme";

export type CodeKind = "otp" | "join";

const LENGTH: Record<CodeKind, number> = { otp: 6, join: 8 };

/**
 * What a typed or pasted code becomes: spaces and hyphens go (codes are often read out in groups),
 * a verification code keeps digits only, a join code keeps letters and digits in upper case.
 */
export function cleanCode(kind: CodeKind, raw: string, length = LENGTH[kind]): string {
  const kept =
    kind === "otp" ? raw.replace(/\D/g, "") : raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return kept.slice(0, length);
}

export type CodeInputProps = Omit<
  TextInputProps,
  | "value"
  | "defaultValue"
  | "onChangeText"
  | "maxLength"
  | "keyboardType"
  | "trailing"
  | "multiline"
  | "mono"
  | "secureTextEntry"
> & {
  /** `otp`: the six-digit email or recovery code. `join`: the eight-character project join code. */
  kind: CodeKind;
  value: string;
  onChangeText: (code: string) => void;
  /** Called once the last character arrives, typed or pasted. */
  onComplete?: ((code: string) => void) | undefined;
  /** Overrides the usual length of the kind (6 or 8). */
  length?: number | undefined;
};

/**
 * One wide field for a whole code — never a row of boxes, so a pasted or autofilled code lands in
 * one go. Mono and letterspaced so each character can be checked against the email or the poster.
 * The counter reads "4 of 6", and "8 of 8" with a check once complete.
 */
export function CodeInput({
  kind,
  value,
  onChangeText,
  onComplete,
  length,
  style,
  ...rest
}: CodeInputProps) {
  const styles = useStyles(makeStyles);
  const target = length ?? LENGTH[kind];
  const complete = value.length >= target;
  const counter = `${Math.min(value.length, target)} of ${target}`;
  const inField = useFieldCounter(counter, complete);
  const otp = kind === "otp";

  return (
    <View style={styles.wrap}>
      <TextInput
        autoCorrect={false}
        spellCheck={false}
        autoCapitalize={otp ? "none" : "characters"}
        autoComplete={otp ? "one-time-code" : "off"}
        textContentType={otp ? "oneTimeCode" : "none"}
        keyboardType={otp ? "number-pad" : "default"}
        importantForAutofill={otp ? "yes" : "no"}
        maxFontSizeMultiplier={1.6}
        {...rest}
        value={value}
        onChangeText={(raw) => {
          const code = cleanCode(kind, raw, target);
          onChangeText(code);
          // A full code that differs from the last one submits, so pasting a corrected code over a
          // rejected one does not need the field cleared first.
          if (code.length === target && code !== value) onComplete?.(code);
        }}
        style={[styles.code, style]}
      />
      {!inField ? <FieldFooter counter={{ text: counter, complete }} /> : null}
    </View>
  );
}

function makeStyles(t: Theme) {
  const { lineHeight: _lineHeight, ...code } = t.type.monoCode;
  return StyleSheet.create({
    wrap: { gap: t.space.s2 },
    code: {
      ...code,
      textAlign: "center",
      minHeight: t.size.collector - t.size.tileBorder * 2,
    },
  });
}
