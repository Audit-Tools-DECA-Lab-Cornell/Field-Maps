import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { GUIDE, searchGuide } from "../../../../src/features/guide/content";
import { PageIntro } from "../../../../src/features/projects/parts";
import {
  Icon,
  Island,
  Screen,
  ScreenHeader,
  ScreenState,
  Text,
  TextInput,
  type Theme,
  useStyles,
  useTheme,
} from "../../../../src/ui";

function guideStyles(t: Theme) {
  return StyleSheet.create({
    body: { gap: t.space.s5 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space.s3,
      minHeight: t.size.touch + 8,
      paddingHorizontal: t.space.s4,
      paddingVertical: t.space.s3,
    },
    divider: { borderTopWidth: t.size.border, borderTopColor: t.c.rule },
    title: { flex: 1 },
    text: { paddingHorizontal: t.space.s4, paddingBottom: t.space.s4, gap: t.space.s3 },
  });
}

/**
 * The offline field guide (MOB-27 step 5): how to place a point, the three rounds, zones, answering,
 * saving and uploading, all readable with no signal. Search narrows the sections as you type; each
 * opens in place.
 */
export default function FieldGuideScreen() {
  const s = useStyles(guideStyles);
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<readonly string[]>(["placing"]);
  const sections = searchGuide(query);
  const searching = query.trim() !== "";

  return (
    <Screen scroll keyboard dock testID="field-guide">
      <ScreenHeader back />
      <View style={s.body}>
        <PageIntro
          title="Field guide"
          lead="How collecting works, on this device and with no signal."
        />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search the guide"
          accessibilityLabel="Search the field guide"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {sections.length === 0 ? (
          <ScreenState
            kind="empty"
            icon="search"
            title="Nothing in the guide matches"
            body={`No section mentions "${query.trim()}". Try one word, such as "zone" or "upload".`}
          />
        ) : (
          <Island padded={false}>
            {sections.map((section, index) => {
              const expanded = searching || open.includes(section.id);
              return (
                <View key={section.id} style={index > 0 ? s.divider : null}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                    accessibilityLabel={section.title}
                    onPress={() =>
                      setOpen(
                        expanded ? open.filter((id) => id !== section.id) : [...open, section.id],
                      )
                    }
                    style={({ pressed }) => [s.row, pressed ? { backgroundColor: t.c.well } : null]}
                  >
                    <Text variant="bodyStrong" style={s.title}>
                      {section.title}
                    </Text>
                    <Icon
                      name={expanded ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={t.c.ink}
                    />
                  </Pressable>
                  {expanded ? (
                    <Animated.View
                      style={s.text}
                      {...(reduceMotion ? {} : { entering: FadeIn.duration(140) })}
                    >
                      {section.body.map((paragraph) => (
                        <Text key={paragraph.slice(0, 32)} tone="ink2" selectable>
                          {paragraph}
                        </Text>
                      ))}
                    </Animated.View>
                  ) : null}
                </View>
              );
            })}
          </Island>
        )}
        <Text variant="small" tone="ink2">
          {`${GUIDE.length} sections · kept on this device`}
        </Text>
      </View>
    </Screen>
  );
}
