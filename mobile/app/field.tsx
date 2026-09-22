import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { FadeRule, GhostAction, Glass, PrimaryAction, Prose } from "../src/components/chrome";
import { QuestionPanel } from "../src/components/question-panel";
import { Screen } from "../src/components/screen";
import { observationSummary } from "../src/domain/build-observation";
import { visibleQuestions } from "../src/forms/engine";
import { useLayout } from "../src/layout/use-layout";
import { FieldMap, type MapRecord } from "../src/maps/field-map";
import { shortLabel, useFieldSession } from "../src/session/provider";
import { useObservations } from "../src/storage/use-observations";
import { colors, space, textStyles } from "../src/theme";

const AUTO_ADVANCE_MS = 160;

export default function FieldScreen() {
  const layout = useLayout();
  const session = useFieldSession();
  const { records } = useObservations();
  const [panelOpen, setPanelOpen] = useState(true);
  const advance = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (advance.current) clearTimeout(advance.current);
    },
    [],
  );

  const { sitePackage, form, zone, placed, armed, state } = session;
  if (!sitePackage || !form || !zone)
    return (
      <Screen>
        <View style={{ padding: space.wide }}>
          <Text style={[textStyles.title, { color: colors.text }]}>No study is open</Text>
          <Prose>Choose a package and a zone before collecting.</Prose>
          <PrimaryAction
            label="Go to assignments"
            onPress={() => router.replace("/")}
            style={{ marginTop: space.loose }}
          />
        </View>
      </Screen>
    );

  const held = records.filter(
    (record) => record.storageStatus === "pending" || record.storageStatus === "local-only",
  ).length;
  const mapRecords: readonly MapRecord[] = records
    .filter((record) => record.siteId === sitePackage.siteId)
    .map((record) => ({
      id: record.id,
      coordinates: record.coordinates,
      label: shortLabel(record.id),
      time: new Date(record.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      summary: observationSummary(record),
    }));

  const visible = visibleQuestions(form, state.answers);
  const question = visible[Math.min(state.index, Math.max(visible.length - 1, 0))];

  function go(destination: "stay" | "review" | "map") {
    if (destination === "review") router.push("/review");
  }

  function step(action: Parameters<typeof session.dispatch>[0]) {
    const result = session.dispatch(action);
    if (advance.current) clearTimeout(advance.current);
    if (result.autoAdvance)
      advance.current = setTimeout(
        () => go(session.dispatch({ kind: "next" }).destination),
        AUTO_ADVANCE_MS,
      );
    else go(result.destination);
  }

  const panel = (
    <View
      style={{
        flex: layout.portrait ? 1 : undefined,
        width: layout.portrait ? undefined : layout.panelWidth,
        minHeight: 0,
        borderLeftWidth: layout.portrait ? 0 : 1,
        borderLeftColor: colors.edge,
      }}
    >
      {placed && question ? (
        <QuestionPanel
          state={state}
          question={question}
          position={Math.min(state.index, visible.length - 1) + 1}
          total={visible.length}
          columns={layout.columns}
          onChoose={(option) => step({ kind: "choose", question: question.id, option })}
          onToggle={(option) => step({ kind: "toggle", question: question.id, option })}
          onWrite={(value) => step({ kind: "write", question: question.id, value })}
          onBack={() => step({ kind: "back" })}
          onAdvance={() => step({ kind: "next" })}
          onReview={() => router.push("/review")}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: space.loose - 1,
            paddingTop: space.loose,
            paddingBottom: space.base,
          }}
        >
          <Text style={[textStyles.heading, { color: colors.text }]}>
            {armed ? "Waiting for your tap" : "No observation open"}
          </Text>
          <View style={{ marginTop: space.tight }}>
            <Prose>
              {armed
                ? "The next tap on the map becomes the child’s position. You can nudge it afterwards."
                : "Pan and zoom freely. When you have chosen a child to follow, arm a point and tap where they are."}
            </Prose>
          </View>
          <PrimaryAction
            label={armed ? "Cancel placing" : "Place a point"}
            tone={armed ? "attention" : "accent"}
            onPress={() => session.setArmed(!armed)}
            style={{ marginTop: space.base + 3 }}
          />
          <FadeRule />
          <Prose tone="faint">
            Panning and zooming stay live until you arm a point, so a stray thumb never drops an
            observation.
          </Prose>
          <GhostAction
            label={`See the ${records.length} ${records.length === 1 ? "record" : "records"} on this device`}
            onPress={() => router.push("/records")}
            style={{ marginTop: space.base }}
          />
        </ScrollView>
      )}
    </View>
  );

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={{
            flex: 1,
            flexDirection: layout.portrait ? "column" : "row",
            minHeight: 0,
          }}
        >
          <View
            style={{
              flex: layout.portrait ? undefined : 1,
              height: layout.portrait ? (panelOpen ? "46%" : "100%") : undefined,
              minWidth: 0,
              padding: space.snug + 2,
            }}
          >
            <FieldMap
              sitePackage={sitePackage}
              zone={zone}
              records={mapRecords}
              placed={placed}
              armed={armed}
              heldLabel={`${held} held`}
              onPlace={session.place}
              onNudge={session.nudgeTo}
              onBack={() => router.navigate("/brief")}
            />
          </View>
          {panelOpen && panel}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={panelOpen ? "Collapse the form panel" : "Show the form panel"}
          onPress={() => setPanelOpen(!panelOpen)}
          style={
            layout.portrait
              ? { position: "absolute", right: space.loose, top: space.loose }
              : {
                  position: "absolute",
                  right: panelOpen ? layout.panelWidth : 0,
                  top: "50%",
                  marginTop: -27,
                }
          }
        >
          <Glass
            style={
              layout.portrait
                ? { paddingHorizontal: space.base, paddingVertical: 7 }
                : {
                    width: 22,
                    height: 54,
                    alignItems: "center",
                    justifyContent: "center",
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                  }
            }
          >
            <Text style={[textStyles.caption, { color: colors.neutral200 }]}>
              {layout.portrait ? (panelOpen ? "Hide form" : "Show form") : panelOpen ? "›" : "‹"}
            </Text>
          </Glass>
        </Pressable>
      </KeyboardAvoidingView>
    </Screen>
  );
}
