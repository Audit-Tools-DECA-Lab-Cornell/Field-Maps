import { BlurView } from "expo-blur";
import type { PropsWithChildren, ReactNode } from "react";
import {
  Pressable,
  type StyleProp,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { colors, fonts, radius, space, textStyles, touchTarget } from "../theme";

/**
 * Nocturne draws rules that fade to transparent at their ends rather than stopping cleanly.
 * React Native has no gradient without a native module, so the ramp is stepped: close enough
 * at one pixel tall, and free of another native dependency.
 */
export function FadeRule({ style }: { readonly style?: StyleProp<ViewStyle> }) {
  const steps = [0.14, 0.3, 0.5, 0.72, 0.88, 1];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ flexDirection: "row", height: 1, marginVertical: space.loose }, style]}
    >
      {steps.map((opacity) => (
        <View key={`in-${opacity}`} style={{ width: 8, backgroundColor: colors.rule, opacity }} />
      ))}
      <View style={{ flex: 1, backgroundColor: colors.rule }} />
      {[...steps].reverse().map((opacity) => (
        <View key={`out-${opacity}`} style={{ width: 8, backgroundColor: colors.rule, opacity }} />
      ))}
    </View>
  );
}

export function SectionLabel({ children }: PropsWithChildren) {
  return <Text style={[textStyles.meta, { color: colors.neutral400 }]}>{children}</Text>;
}

export function Prose({
  children,
  tone = "muted",
  selectable = false,
}: PropsWithChildren<{
  readonly tone?: "muted" | "body" | "faint";
  readonly selectable?: boolean;
}>) {
  const color =
    tone === "body" ? colors.neutral300 : tone === "faint" ? colors.neutral500 : colors.neutral400;
  return (
    <Text selectable={selectable} style={[textStyles.detail, { color }]}>
      {children}
    </Text>
  );
}

type ActionProps = {
  readonly label: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
  readonly tone?: "accent" | "attention";
  readonly style?: StyleProp<ViewStyle>;
};

/** The primary action is an accent outline. Nocturne never floods a button with the accent. */
export function PrimaryAction({
  label,
  onPress,
  disabled = false,
  tone = "accent",
  style,
}: ActionProps) {
  const line = tone === "attention" ? colors.attentionLine : colors.accent;
  const ink = tone === "attention" ? colors.attentionText : colors.accent200;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 48,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: space.loose,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: line,
          backgroundColor: pressed ? colors.accent900 : "transparent",
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: ink }}>{label}</Text>
    </Pressable>
  );
}

export function GhostAction({ label, onPress, disabled = false, style }: ActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: touchTarget,
          justifyContent: "center",
          alignItems: "center",
          borderRadius: radius.md,
          backgroundColor: pressed ? colors.neutral900 : "transparent",
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      <Text style={[textStyles.body, { color: colors.neutral400 }]}>{label}</Text>
    </Pressable>
  );
}

export function LinkAction({
  label,
  onPress,
  muted = false,
  disabled = false,
}: {
  readonly label: string;
  readonly onPress: () => void;
  readonly muted?: boolean;
  readonly disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: touchTarget,
        justifyContent: "center",
        paddingVertical: space.tight,
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={[textStyles.detail, { color: muted ? colors.neutral400 : colors.accent300 }]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * A choice. Selected state is an accent tint plus a two-pixel accent bar down the left edge —
 * no outlined boxes, no uppercase micro-labels.
 */
export function OptionButton({
  label,
  selected,
  onPress,
  disabled = false,
  compact = false,
}: {
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
  readonly disabled?: boolean;
  readonly compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: touchTarget + 2,
        justifyContent: "center",
        paddingVertical: space.base,
        paddingHorizontal: compact ? space.base : space.base + 2,
        borderRadius: radius.md + 2,
        borderLeftWidth: 2,
        borderLeftColor: selected ? colors.accent400 : "transparent",
        backgroundColor: selected
          ? colors.accent800
          : pressed
            ? colors.neutral800
            : colors.neutral900,
        opacity: disabled ? 0.45 : 1,
      })}
    >
      <Text
        style={{
          fontFamily: selected ? fonts.medium : fonts.regular,
          fontSize: 14.5,
          lineHeight: 19,
          color: selected ? colors.accent100 : colors.neutral300,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export type ChipTone = "accent" | "muted" | "attention" | "live";

export function Chip({
  label,
  tone = "muted",
}: {
  readonly label: string;
  readonly tone?: ChipTone | undefined;
}) {
  const palette: Record<ChipTone, readonly [string, string]> = {
    accent: [colors.accent900, colors.accent300],
    muted: ["#24262f", colors.neutral400],
    attention: [colors.attentionGround, colors.attentionText],
    live: ["#22303a", "#9ecfe0"],
  };
  const [background, ink] = palette[tone];
  return (
    <Text
      style={[
        textStyles.micro,
        {
          color: ink,
          backgroundColor: background,
          borderRadius: radius.pill,
          paddingHorizontal: space.snug + 1,
          paddingVertical: space.hair,
          overflow: "hidden",
        },
      ]}
    >
      {label}
    </Text>
  );
}

/**
 * An attention block: a single coloured line down the left, never a filled alert box.
 * Reserved for validation, needs-attention records and unresolved protocol questions.
 */
export function AttentionNote({
  title,
  body,
  children,
  role,
}: PropsWithChildren<{
  readonly title: string;
  readonly body?: string;
  readonly role?: "alert";
}>) {
  return (
    <View
      style={{
        borderLeftWidth: 2,
        borderLeftColor: colors.attentionLine,
        paddingLeft: space.base + 2,
        paddingVertical: 2,
      }}
    >
      <Text
        accessibilityRole={role}
        selectable
        style={[textStyles.bodyStrong, { color: colors.attentionText }]}
      >
        {title}
      </Text>
      {body !== undefined && (
        <Text selectable style={[textStyles.caption, { color: colors.neutral400, marginTop: 4 }]}>
          {body}
        </Text>
      )}
      {children}
    </View>
  );
}

/** Accent-lined note used for inherited round context and other quiet emphasis. */
export function AccentNote({ children }: PropsWithChildren) {
  return (
    <View
      style={{ borderLeftWidth: 2, borderLeftColor: colors.accent, paddingLeft: space.base + 2 }}
    >
      {children}
    </View>
  );
}

/**
 * Translucent dark glass for map chrome. The tint carries the contrast on its own, so the
 * control stays legible even before a native rebuild makes the blur available.
 */
export function Glass({
  children,
  style,
}: PropsWithChildren<{ readonly style?: StyleProp<ViewStyle> }>) {
  return (
    <BlurView
      intensity={18}
      tint="dark"
      style={[
        { backgroundColor: colors.glass, borderRadius: radius.md, overflow: "hidden" },
        style,
      ]}
    >
      {children}
    </BlurView>
  );
}

export function MapPill({
  label,
  onPress,
  active = false,
  accessibilityLabel,
}: {
  readonly label: string;
  readonly onPress?: () => void;
  readonly active?: boolean;
  readonly accessibilityLabel?: string;
}) {
  const ink = active ? colors.accent200 : colors.neutral300;
  const content = (
    <Text style={[textStyles.micro, { color: ink }]} numberOfLines={1}>
      {label}
    </Text>
  );
  if (!onPress)
    return (
      <Glass style={{ paddingHorizontal: space.snug + 2, paddingVertical: space.tight }}>
        {content}
      </Glass>
    );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      hitSlop={6}
    >
      {({ pressed }) => (
        <Glass
          style={{
            paddingHorizontal: space.snug + 2,
            minHeight: 34,
            justifyContent: "center",
            opacity: pressed ? 0.75 : 1,
          }}
        >
          {content}
        </Glass>
      )}
    </Pressable>
  );
}

export function MapSquareButton({
  glyph,
  onPress,
  accessibilityLabel,
  disabled = false,
}: {
  readonly glyph: string;
  readonly onPress: () => void;
  readonly accessibilityLabel: string;
  readonly disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
    >
      {({ pressed }) => (
        <Glass
          style={{
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
            opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
          }}
        >
          <Text style={{ fontFamily: fonts.medium, fontSize: 17, color: colors.neutral200 }}>
            {glyph}
          </Text>
        </Glass>
      )}
    </Pressable>
  );
}

/** A row in a list: no card, no border box — a hairline underneath and generous height. */
export function RowButton({
  onPress,
  children,
  disabled = false,
  accessibilityLabel,
}: PropsWithChildren<{
  readonly onPress: () => void;
  readonly disabled?: boolean;
  readonly accessibilityLabel?: string;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: touchTarget + 8,
        justifyContent: "center",
        paddingVertical: space.base + 2,
        borderBottomWidth: 1,
        borderBottomColor: colors.ruleFaint,
        opacity: disabled ? 0.55 : pressed ? 0.7 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}

export function RowHeading({
  title,
  chip,
  chipTone,
  titleStyle,
}: {
  readonly title: string;
  readonly chip?: string;
  readonly chipTone?: ChipTone | undefined;
  readonly titleStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: space.base,
      }}
    >
      <Text
        style={[
          { fontFamily: fonts.medium, fontSize: 17, color: colors.text, flexShrink: 1 },
          titleStyle,
        ]}
      >
        {title}
      </Text>
      {chip !== undefined && <Chip label={chip} tone={chipTone} />}
    </View>
  );
}

export function ScreenFooter({ children }: { readonly children: ReactNode }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space.snug,
        paddingHorizontal: space.loose,
        paddingTop: 7,
        paddingBottom: 9,
        borderTopColor: colors.edge,
        borderTopWidth: 1,
      }}
    >
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent }} />
      <Text numberOfLines={1} style={[textStyles.micro, { color: colors.neutral500, flex: 1 }]}>
        {children}
      </Text>
    </View>
  );
}
