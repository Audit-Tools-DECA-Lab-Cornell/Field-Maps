import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { AccessibilityInfo, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { Icon } from "./Icon";
import { Text } from "./Text";
import { type Theme, useStyles, useTheme } from "./theme";

/**
 * A labelled control: the label above, the control, then one line under it. That line says what is
 * wrong (attention, with a triangle), what already passes (saved, with a check: "16 characters"),
 * or how to fill it in — and, on the right, a counter such as "69 / 1000" or "4 of 6".
 *
 * The inputs inside read the label and the message from this field, so a screen reader announces
 * "Email address" on the input itself. Textarea and CodeInput hand their counter up to the field.
 */

export type FieldCounter = { text: string; complete: boolean };

type FieldContextValue = {
  label: string;
  /** What the control announces as its hint: the error, or the live check and the hint. */
  hint: string | undefined;
  invalid: boolean;
  setCounter: (counter: FieldCounter | undefined) => void;
};

const FieldContext = createContext<FieldContextValue | null>(null);

/** The field around a control, or null when the control stands alone. */
export function useField(): FieldContextValue | null {
  return useContext(FieldContext);
}

/**
 * Hands a counter to the surrounding Field. Returns false when there is no Field, so the control
 * shows the counter itself.
 */
export function useFieldCounter(text: string | undefined, complete: boolean): boolean {
  const field = useContext(FieldContext);
  const setCounter = field?.setCounter;
  // Layout effect: the counter is in place before the first frame is drawn.
  useLayoutEffect(() => {
    setCounter?.(text === undefined ? undefined : { text, complete });
  }, [setCounter, text, complete]);
  useLayoutEffect(() => () => setCounter?.(undefined), [setCounter]);
  return field !== null;
}

type FieldProps = {
  label: string;
  children: ReactNode;
  /** How to fill it in: "Up to 10 uppercase characters." */
  hint?: string | undefined;
  /** What is wrong, in plain words: "Does not match yet". Replaces the hint and the live check. */
  error?: string | undefined;
  /** A live check that already passes: "16 characters". The hint follows it on the same line. */
  success?: string | undefined;
  /** Right-hand counter. A Textarea or CodeInput inside supplies its own when this is unset. */
  counter?: string | undefined;
  /** The counter has reached its target: it turns saved and gains a check ("8 of 8"). */
  counterComplete?: boolean | undefined;
  style?: StyleProp<ViewStyle> | undefined;
};

export function Field({
  label,
  children,
  hint,
  error,
  success,
  counter,
  counterComplete,
  style,
}: FieldProps) {
  const styles = useStyles(makeStyles);
  const [registered, setCounter] = useState<FieldCounter | undefined>(undefined);
  const invalid = error !== undefined && error !== "";
  const spoken = invalid ? error : [success, hint].filter(Boolean).join(". ") || undefined;
  const context = useMemo<FieldContextValue>(
    () => ({ label, hint: spoken, invalid, setCounter }),
    [label, spoken, invalid],
  );

  // An error that appears while typing is read out once; live checks stay quiet.
  useEffect(() => {
    if (invalid && error) AccessibilityInfo.announceForAccessibility(error);
  }, [invalid, error]);

  const shownCounter =
    counter !== undefined ? { text: counter, complete: counterComplete === true } : registered;

  return (
    <View style={[styles.field, style]}>
      <Text variant="bodyStrong">{label}</Text>
      <FieldContext.Provider value={context}>{children}</FieldContext.Provider>
      <FieldFooter hint={hint} error={error} success={success} counter={shownCounter} />
    </View>
  );
}

type FieldFooterProps = {
  hint?: string | undefined;
  error?: string | undefined;
  success?: string | undefined;
  counter?: FieldCounter | undefined;
};

/** The line under a control. Field draws it; a control outside a Field draws it for its counter. */
export function FieldFooter({ hint, error, success, counter }: FieldFooterProps) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const invalid = error !== undefined && error !== "";
  const hasLeft = invalid || Boolean(success) || Boolean(hint);
  if (!hasLeft && !counter) return null;

  let left: ReactNode = null;
  if (invalid) {
    left = (
      <View style={styles.message}>
        <View style={styles.glyph}>
          <Icon name="triangle-alert" color={theme.c.attention} />
        </View>
        <Text variant="bodyStrong" tone="attention" style={styles.messageText}>
          {error}
        </Text>
      </View>
    );
  } else if (success) {
    left = (
      <View style={styles.message}>
        <View style={styles.glyph}>
          <Icon name="check" color={theme.c.saved} />
        </View>
        <Text variant="body" tone="ink2" style={styles.messageText}>
          <Text variant="bodyStrong" tone="saved">
            {success}
          </Text>
          {hint ? `  ${hint}` : null}
        </Text>
      </View>
    );
  } else if (hint) {
    left = (
      <Text variant="body" tone="ink2" style={styles.messageText}>
        {hint}
      </Text>
    );
  }

  return (
    <View style={styles.footer} accessibilityLiveRegion={invalid ? "polite" : "none"}>
      {left ?? <View style={styles.messageText} />}
      {counter ? <CounterText counter={counter} /> : null}
    </View>
  );
}

function CounterText({ counter }: { counter: FieldCounter }) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  if (!counter.complete)
    return (
      <Text variant="monoData" tone="ink2" style={styles.counterText}>
        {counter.text}
      </Text>
    );
  return (
    <View style={[styles.message, styles.counterBox]}>
      <View style={styles.glyph}>
        <Icon name="check" color={theme.c.saved} />
      </View>
      <Text variant="bodyStrong" tone="saved">
        {counter.text}
      </Text>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    field: { gap: t.space.s2 },
    footer: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: t.space.s3,
    },
    message: { flexDirection: "row", alignItems: "flex-start", gap: t.space.s2, flexShrink: 1 },
    messageText: { flexShrink: 1, flexGrow: 1 },
    // Holds the glyph on the first line of text, however many lines the message wraps to.
    glyph: { minHeight: t.type.body.lineHeight, justifyContent: "center" },
    counterBox: { flexShrink: 0 },
    counterText: { flexShrink: 0, textAlign: "right" },
  });
}
