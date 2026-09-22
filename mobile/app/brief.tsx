import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import {
  AccentNote,
  AttentionNote,
  FadeRule,
  LinkAction,
  OptionButton,
  PrimaryAction,
  Prose,
  SectionLabel,
} from "../src/components/chrome";
import { PageScreen } from "../src/components/screen";
import { useLayout } from "../src/layout/use-layout";
import { useFieldSession } from "../src/session/provider";
import { colors, space, textStyles } from "../src/theme";

export default function SiteBriefScreen() {
  const {
    sitePackage,
    form,
    zone,
    round,
    freshPeriod,
    chooseZone,
    chooseRound,
    toggleFreshPeriod,
  } = useFieldSession();
  const layout = useLayout();
  const [notesOpen, setNotesOpen] = useState(false);

  if (!sitePackage || !form || !zone)
    return (
      <PageScreen>
        <LinkAction
          label="← Studies"
          muted
          onPress={() => router.replace("/")}
          style={{ alignSelf: "flex-start" }}
        />
        <Text style={[textStyles.title, { color: colors.text, marginTop: space.snug }]}>
          Open a study first
        </Text>
        <Prose>Choose a package on the assignments screen to set its zone and round.</Prose>
      </PageScreen>
    );

  const notes = form.protocolNotes;

  return (
    <PageScreen>
      <LinkAction
        label="← Studies"
        muted
        onPress={() => router.navigate("/")}
        style={{ alignSelf: "flex-start" }}
      />
      <Text style={[textStyles.title, { color: colors.text, marginTop: space.snug }]}>
        {sitePackage.name}
      </Text>
      <Text style={[textStyles.meta, { color: colors.neutral400, marginTop: 3 }]}>
        Package {sitePackage.version} · {sitePackage.zones.length}{" "}
        {sitePackage.zones.length === 1 ? "zone" : "zones"} · {sitePackage.sizeOnDevice}
      </Text>

      <View style={{ marginTop: space.wide }}>
        <SectionLabel>Where are you working?</SectionLabel>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: space.tight,
            marginTop: space.snug + 1,
          }}
        >
          {sitePackage.zones.map((entry) => (
            <View key={entry.id} style={{ minWidth: layout.tablet ? 190 : 150 }}>
              <OptionButton
                label={entry.label}
                selected={entry.id === zone.id}
                onPress={() => chooseZone(entry)}
              />
            </View>
          ))}
        </View>
      </View>

      <View style={{ marginTop: space.loose }}>
        <SectionLabel>Which round?</SectionLabel>
        <View style={{ flexDirection: "row", gap: space.tight, marginTop: space.snug + 1 }}>
          {sitePackage.rounds.map((entry) => (
            <View key={entry} style={{ minWidth: 104 }}>
              <OptionButton
                label={`Round ${entry}`}
                selected={entry === round}
                onPress={() => chooseRound(entry)}
              />
            </View>
          ))}
        </View>
      </View>

      <View style={{ marginTop: space.loose }}>
        <AccentNote>
          <Text style={[textStyles.detail, { color: colors.neutral300 }]}>
            {freshPeriod
              ? "This round is recorded as a fresh observation period, so nothing is inherited."
              : sitePackage.inheritedContext}
          </Text>
          <LinkAction
            label={
              freshPeriod
                ? `Inherit from round ${sitePackage.rounds[0] ?? 1} instead`
                : "This is a fresh observation period"
            }
            onPress={toggleFreshPeriod}
            style={{ alignSelf: "flex-start" }}
          />
        </AccentNote>
      </View>

      <PrimaryAction
        label={`Start observing · ${zone.label}, round ${round}`}
        onPress={() => router.push("/field")}
        style={{ marginTop: space.loose }}
      />

      <FadeRule />

      <SectionLabel>This site collects</SectionLabel>
      <Text style={[textStyles.bodyStrong, { color: colors.text, marginTop: 5 }]}>
        {form.title} · {form.version}
      </Text>
      <Prose>{form.summary}</Prose>
      <Text style={[textStyles.caption, { color: colors.neutral500, marginTop: space.tight }]}>
        {form.inclusion}
      </Text>

      {notes.length > 0 && (
        <View style={{ marginTop: space.loose }}>
          <AttentionNote
            title={`${notes.length} open protocol ${notes.length === 1 ? "decision" : "decisions"}`}
            body="These are unresolved in the source workbook. They are carried here so nothing ships as though it were settled."
          >
            <LinkAction
              label={notesOpen ? "Hide the list" : "Read them"}
              onPress={() => setNotesOpen(!notesOpen)}
              style={{ alignSelf: "flex-start" }}
            />
          </AttentionNote>
          {notesOpen && (
            <View style={{ marginTop: space.snug, gap: space.base }}>
              {notes.map((note) => (
                <View key={note.id}>
                  <Text style={[textStyles.bodyStrong, { color: colors.text }]}>{note.title}</Text>
                  <Text
                    selectable
                    style={[textStyles.caption, { color: colors.neutral400, marginTop: 2 }]}
                  >
                    {note.detail}
                  </Text>
                  <Text style={[textStyles.micro, { color: colors.neutral600, marginTop: 2 }]}>
                    {note.source}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </PageScreen>
  );
}
