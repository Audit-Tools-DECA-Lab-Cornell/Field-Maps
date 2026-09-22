import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import {
  AttentionNote,
  Chip,
  FadeRule,
  GhostAction,
  LinkAction,
  Prose,
  RowButton,
  RowHeading,
  SectionLabel,
} from "../src/components/chrome";
import { PageScreen } from "../src/components/screen";
import { availabilityChip, bundledPackages } from "../src/packages/bundled";
import type { PackageSummary } from "../src/packages/site-package";
import { useFieldSession } from "../src/session/provider";
import { draftSummary } from "../src/storage/draft-store";
import { useObservations } from "../src/storage/use-observations";
import { colors, space, textStyles } from "../src/theme";

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];

export default function AssignmentsScreen() {
  const {
    recovered,
    inProgress,
    discard,
    resumeRecovered,
    discardRecovered,
    openPackage,
    announce,
  } = useFieldSession();
  const { records } = useObservations();
  const [summaries, setSummaries] = useState<readonly PackageSummary[]>([]);

  useEffect(() => {
    let active = true;
    void bundledPackages
      .list()
      .then((result) => {
        if (active) setSummaries(result);
      })
      .catch(() => {
        if (active) announce("The package list could not be read on this device.");
      });
    return () => {
      active = false;
    };
  }, [announce]);

  async function open(summary: PackageSummary) {
    if (summary.availability !== "on-device") {
      announce(
        summary.availability === "archived"
          ? `${summary.name} is closed and read only.`
          : `${summary.name} is not on this device. Package delivery is not built yet.`,
      );
      return;
    }
    const outcome = await openPackage(summary.id);
    if (outcome.ok) router.push("/brief");
    else announce(outcome.reason);
  }

  return (
    <PageScreen>
      {recovered && (
        <View style={{ marginBottom: space.wide }}>
          <AttentionNote title="A draft survived the crash" body={draftSummary(recovered)}>
            <View style={{ flexDirection: "row", gap: space.loose }}>
              <LinkAction
                label="Resume it"
                onPress={() => {
                  void resumeRecovered().then((opened) => {
                    if (opened) router.push("/field");
                  });
                }}
              />
              <LinkAction
                label="Discard"
                muted
                onPress={() => {
                  void discardRecovered();
                }}
              />
            </View>
          </AttentionNote>
        </View>
      )}

      {inProgress && !recovered && (
        <View style={{ marginBottom: space.wide }}>
          <AttentionNote
            title="An observation is still open"
            body={`It belongs to ${inProgress.packageName}. Finish or discard it before opening another study — every answer is already on the device.`}
          >
            <View style={{ flexDirection: "row", gap: space.loose }}>
              <LinkAction label="Go back to it" onPress={() => router.push("/field")} />
              <LinkAction label="Discard" muted onPress={discard} />
            </View>
          </AttentionNote>
        </View>
      )}

      <SectionLabel>Assigned to you</SectionLabel>
      <Text style={[textStyles.display, { color: colors.text, marginTop: space.tight }]}>
        {WORDS[summaries.length] ?? summaries.length} studies waiting
      </Text>

      <View style={{ marginTop: space.wide }}>
        {summaries.map((summary) => {
          const chip = availabilityChip(summary.availability);
          return (
            <RowButton
              key={summary.id}
              disabled={summary.availability !== "on-device"}
              accessibilityLabel={`${summary.name}. ${chip.label}.`}
              onPress={() => {
                void open(summary);
              }}
            >
              <RowHeading title={summary.name} chip={chip.label} chipTone={chip.tone} />
              <Text style={[textStyles.meta, { color: colors.neutral400, marginTop: 4 }]}>
                {summary.meta}
              </Text>
            </RowButton>
          );
        })}
      </View>

      <FadeRule />
      <Prose tone="faint">
        Package delivery is stubbed. The two packages on this device are bundled with the app; the
        others are rows only, so no download, cellular rule or hosted package format is implied
        here.
      </Prose>

      <View style={{ marginTop: space.loose, gap: space.tight }}>
        <GhostAction
          label={`See the ${records.length} ${
            records.length === 1 ? "record" : "records"
          } on this device`}
          onPress={() => router.push("/records")}
        />
        <GhostAction label="Account and synchronisation" onPress={() => router.push("/account")} />
      </View>

      <View style={{ height: space.wide }} />
      <View style={{ alignSelf: "flex-start" }}>
        <Chip label="Offline first · nothing is fetched on the field screen" tone="muted" />
      </View>
    </PageScreen>
  );
}
