import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { ACTS } from "../forms/definition";
import type { ResolvedQuestion } from "../forms/engine";
import type { SessionState } from "../forms/session";
import { colors, fonts, radius, space, textStyles } from "../theme";
import { AttentionNote, LinkAction, OptionButton, PrimaryAction, Prose } from "./chrome";

type Props = {
  readonly state: SessionState;
  readonly question: ResolvedQuestion;
  readonly position: number;
  readonly total: number;
  readonly columns: (preferred: number) => number;
  readonly onChoose: (option: string) => void;
  readonly onToggle: (option: string) => void;
  readonly onWrite: (value: string) => void;
  readonly onBack: () => void;
  readonly onAdvance: () => void;
  readonly onReview: () => void;
};

const GAP = 6;

/**
 * One question fills the panel. The questionnaire is never scrolled as a whole: a single choice
 * moves on by itself, and multi-select and text wait for Continue, so nothing is answered by
 * accident while walking.
 */
export function QuestionPanel({
  state,
  question,
  position,
  total,
  columns,
  onChoose,
  onToggle,
  onWrite,
  onBack,
  onAdvance,
  onReview,
}: Props) {
  const value = state.answers[question.id];
  const selected = typeof value === "string" ? value : "";
  const chosen = Array.isArray(value) ? value : [];
  const [gridWidth, setGridWidth] = useState(0);
  const cols = columns(question.columns);
  const itemWidth = gridWidth > 0 ? (gridWidth - GAP * (cols - 1)) / cols : undefined;
  const actIndex = ACTS.indexOf(question.act);

  const [text, setText] = useState(typeof value === "string" ? value : "");
  const [shown, setShown] = useState(question.id);
  const flush = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Reload the field only when the question changes. Re-reading it whenever the stored answer
  // lands would let a debounced write arrive after a newer keystroke and undo the character.
  if (shown !== question.id) {
    setShown(question.id);
    setText(typeof value === "string" ? value : "");
  }
  useEffect(
    () => () => {
      if (flush.current) clearTimeout(flush.current);
    },
    [],
  );

  function type(next: string) {
    const cleaned = question.kind === "number" ? next.replace(/[^0-9]/g, "") : next;
    setText(cleaned);
    if (flush.current) clearTimeout(flush.current);
    // Typing is written to the draft a beat after it stops, rather than on every keystroke.
    flush.current = setTimeout(() => onWrite(cleaned), 300);
  }

  function commit() {
    if (flush.current) clearTimeout(flush.current);
    onWrite(text);
  }

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <View
        style={{
          flexDirection: "row",
          gap: 4,
          paddingHorizontal: space.loose - 1,
          paddingTop: space.base,
        }}
      >
        {ACTS.map((act, index) => (
          <View
            key={act}
            accessibilityLabel={index === actIndex ? `Act: ${act}` : undefined}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor:
                index < actIndex
                  ? colors.accent700
                  : index === actIndex
                    ? colors.accent
                    : colors.neutral900,
            }}
          />
        ))}
      </View>

      <ScrollView
        style={{ flex: 1, minHeight: 0 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: space.loose - 1,
          paddingTop: space.base + 1,
          paddingBottom: space.snug,
        }}
      >
        <View
          style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}
        >
          <Text style={[textStyles.caption, { color: colors.accent300 }]}>{question.act}</Text>
          <Text style={[textStyles.caption, { color: colors.neutral500 }]}>
            {position} of {total}
          </Text>
        </View>

        <Text style={[textStyles.question, { color: colors.text, marginTop: 7 }]}>
          {question.label}
        </Text>
        {question.hint !== undefined && (
          <View style={{ marginTop: 5 }}>
            <Prose>{question.hint}</Prose>
          </View>
        )}
        {question.openedBy !== undefined && (
          <Text style={[textStyles.caption, { color: colors.accent300, marginTop: 7 }]}>
            {question.openedBy}
          </Text>
        )}

        {(question.kind === "one" || question.kind === "many") && (
          <View
            onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: GAP,
              marginTop: space.base + 3,
            }}
          >
            {question.options.map((option) => (
              <View key={option.code} style={{ width: itemWidth }}>
                <OptionButton
                  label={option.label}
                  selected={
                    question.kind === "one"
                      ? selected === option.code
                      : chosen.includes(option.code)
                  }
                  onPress={() =>
                    question.kind === "one" ? onChoose(option.code) : onToggle(option.code)
                  }
                />
              </View>
            ))}
          </View>
        )}

        {question.optionsPending !== undefined && (
          <View style={{ marginTop: space.base + 3 }}>
            <AttentionNote title="No option list yet" body={question.optionsPending} />
          </View>
        )}

        {(question.kind === "text" || question.kind === "number") && (
          <TextInput
            accessibilityLabel={question.label}
            value={text}
            onChangeText={type}
            onBlur={commit}
            multiline={question.kind === "text" && (question.rows ?? 1) > 1}
            numberOfLines={question.rows ?? 1}
            keyboardType={question.kind === "number" ? "number-pad" : "default"}
            autoCapitalize={question.maxLength === 10 ? "characters" : "sentences"}
            autoCorrect={question.kind === "text"}
            maxLength={question.maxLength}
            textAlignVertical="top"
            placeholder={question.placeholder}
            placeholderTextColor={colors.neutral600}
            style={{
              marginTop: space.base + 3,
              backgroundColor: colors.neutral900,
              borderRadius: radius.md + 2,
              paddingHorizontal: 13,
              paddingVertical: 12,
              color: colors.text,
              fontFamily: fonts.regular,
              fontSize: 15,
              lineHeight: 22,
              minHeight: Math.max(48, (question.rows ?? 1) * 24 + 24),
            }}
          />
        )}

        {question.protocolFlag !== undefined && (
          <View style={{ marginTop: space.base + 3 }}>
            <AttentionNote title="Protocol question for Janet" body={question.protocolFlag} />
          </View>
        )}

        {state.notice && (
          <View style={{ marginTop: space.base + 3 }}>
            <AttentionNote
              role="alert"
              title={`${state.notice.count} ${
                state.notice.count === 1 ? "answer was" : "answers were"
              } dropped`}
              body={`No longer asked: ${state.notice.questions.join("; ")}. Hidden answers are never saved.`}
            />
          </View>
        )}

        {(question.kind === "many" || question.kind === "text" || question.kind === "number") && (
          <PrimaryAction
            label="Continue"
            onPress={() => {
              commit();
              onAdvance();
            }}
            style={{ marginTop: space.base + 3 }}
          />
        )}
      </ScrollView>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: space.snug,
          paddingHorizontal: space.loose - 1,
          paddingBottom: space.base,
        }}
      >
        <LinkAction label="← Back" muted onPress={onBack} />
        <View style={{ flexDirection: "row", gap: space.loose, alignItems: "center" }}>
          {!question.required && <LinkAction label="Skip" muted onPress={onAdvance} />}
          <LinkAction label="Review & save" onPress={onReview} />
        </View>
      </View>
    </View>
  );
}
