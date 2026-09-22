import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  AttentionNote,
  FadeRule,
  GhostAction,
  LinkAction,
  PrimaryAction,
  Prose,
  SectionLabel,
} from "../src/components/chrome";
import { PageScreen } from "../src/components/screen";
import { answerSummary, exportAnswers, isAnswered, visibleQuestions } from "../src/forms/engine";
import { useFieldSession } from "../src/session/provider";
import { colors, fonts, space, textStyles, touchTarget } from "../src/theme";

export default function ReviewScreen() {
  const session = useFieldSession();
  const [blocked, setBlocked] = useState<readonly string[]>([]);
  const [failure, setFailure] = useState("");
  const [saving, setSaving] = useState(false);
  const { form, state } = session;

  function back() {
    if (router.canGoBack()) router.back();
    else router.navigate("/field");
  }

  if (!form)
    return (
      <PageScreen>
        <Text style={[textStyles.title, { color: colors.text }]}>No observation open</Text>
        <Prose>Place a point on the field map to start one.</Prose>
        <PrimaryAction
          label="Go to assignments"
          onPress={() => router.replace("/")}
          style={{ marginTop: space.loose }}
        />
      </PageScreen>
    );

  const visible = visibleQuestions(form, state.answers);
  const answered = visible.filter((question) => isAnswered(state.answers[question.id])).length;
  const withoutColumn = exportAnswers(form, state.answers).withoutColumn;

  async function save() {
    setSaving(true);
    const outcome = await session.save();
    if (outcome.ok) {
      // The session is reset by the save, so leave the sheet before it re-reads empty answers.
      router.replace({ pathname: "/saved", params: { held: outcome.heldOnly ? "1" : "0" } });
      return;
    }
    setSaving(false);
    setBlocked(outcome.problems.map((problem) => problem.question.id));
    setFailure(outcome.message ?? "");
  }

  let lastAct = "";
  return (
    <PageScreen>
      <LinkAction label="← Keep answering" muted onPress={back} />
      <Text style={[textStyles.title, { color: colors.text, marginTop: space.snug }]}>
        Before you save
      </Text>
      <Text style={[textStyles.meta, { color: colors.neutral400, marginTop: 3 }]}>
        {answered} of {visible.length} questions answered · every answer is already on the device
      </Text>

      {blocked.length > 0 && (
        <View style={{ marginTop: space.base + 3 }}>
          <AttentionNote
            role="alert"
            title={`${blocked.length} required ${blocked.length === 1 ? "answer is" : "answers are"} still empty`}
            body="Saving is blocked until these have answers. Nothing you have entered is lost."
          />
        </View>
      )}
      {failure !== "" && (
        <View style={{ marginTop: space.base }}>
          <AttentionNote role="alert" title="This observation was not saved" body={failure} />
        </View>
      )}

      <View style={{ marginTop: space.loose }}>
        {visible.map((question, index) => {
          const group = question.act === lastAct ? "" : question.act;
          lastAct = question.act;
          const value = state.answers[question.id];
          const flagged = blocked.includes(question.id);
          const empty = !isAnswered(value);
          return (
            <View key={question.id}>
              {group !== "" && (
                <Text
                  style={[
                    textStyles.caption,
                    { color: colors.accent300, marginTop: space.loose, marginBottom: 5 },
                  ]}
                >
                  {group}
                </Text>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${question.label}. ${answerSummary(question, value)}. Tap to answer it again.`}
                onPress={() => {
                  session.dispatch({ kind: "jump", index });
                  back();
                }}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  gap: space.base,
                  alignItems: "baseline",
                  borderBottomWidth: 1,
                  borderBottomColor: colors.ruleFaint,
                  paddingVertical: space.snug + 2,
                  minHeight: touchTarget,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={[textStyles.meta, { color: colors.neutral400, flex: 1 }]}>
                  {question.label}
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.medium,
                    fontSize: 14,
                    maxWidth: "46%",
                    textAlign: "right",
                    color: flagged ? colors.attentionText : empty ? colors.neutral500 : colors.text,
                  }}
                >
                  {answerSummary(question, value)}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      <FadeRule />

      {withoutColumn.length > 0 && (
        <View style={{ marginBottom: space.base }}>
          <AttentionNote
            title={`${withoutColumn.length} ${withoutColumn.length === 1 ? "answer has" : "answers have"} no approved export column`}
            body={`${withoutColumn
              .map((question) => question.label)
              .join(
                "; ",
              )}. They are stored against their question identifiers until the column names are agreed.`}
          />
        </View>
      )}

      <PrimaryAction
        label={saving ? "Saving…" : "Save observation"}
        disabled={saving}
        onPress={() => {
          void save();
        }}
      />
      <GhostAction
        label="Discard this observation"
        onPress={() => {
          session.discard();
          back();
        }}
        style={{ marginTop: space.snug }}
      />
      <View style={{ marginTop: space.loose }}>
        <SectionLabel>Where it goes</SectionLabel>
        <Prose tone="faint">
          Saved records are written to this device first. Only a form version the API accepts is
          queued for upload, and only a matching server receipt marks one as synced.
        </Prose>
      </View>
    </PageScreen>
  );
}
