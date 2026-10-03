import type { ReactNode } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { Icon, isIconName } from "./Icon";
import { Text } from "./Text";
import { type Theme, useStyles, useTheme } from "./theme";
import { type StateKey, stateOf, toneColor, toneSoft } from "./tokens";

export type ProposalNoteProps = {
  /** The proposal's code from the product decisions: "U5". */
  code?: string | undefined;
  /** Which proposal word heads the note (contract `proposal` states): Proposal, Not stored, Protocol note. */
  kind?: StateKey<"proposal"> | undefined;
  /** Overrides the heading word. */
  label?: string | undefined;
  /** What is still undecided: "The Approved-only gate is optional and not decided." */
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string | undefined;
};

function proposalStyles(t: Theme) {
  return StyleSheet.create({
    note: {
      padding: t.space.s4,
      borderRadius: t.radius.note,
      gap: t.space.s1,
    },
    heading: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space.s2,
    },
  });
}

/**
 * An open product decision carried in the interface: a flag, the mono heading "PROPOSAL U5" in the
 * waiting tone, and the sentence saying what is not decided. It never reads as settled behaviour.
 */
export function ProposalNote({
  code,
  kind = "open",
  label,
  children,
  style,
  testID,
}: ProposalNoteProps) {
  const t = useTheme();
  const s = useStyles(proposalStyles);
  const state = stateOf("proposal", kind);
  const heading = [label ?? state.label, code].filter(Boolean).join(" ");
  const color = toneColor(t.c, state.tone);
  return (
    <View
      testID={testID}
      accessible
      style={[s.note, { backgroundColor: toneSoft(t.c, state.tone) }, style]}
    >
      <View style={s.heading}>
        <Icon name={isIconName(state.icon) ? state.icon : "flag"} size={16} color={color} />
        <Text variant="monoLabel" tone={state.tone}>
          {heading}
        </Text>
      </View>
      <Text variant="body">{children}</Text>
    </View>
  );
}
