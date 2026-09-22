import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import {
  AttentionNote,
  Chip,
  type ChipTone,
  FadeRule,
  GhostAction,
  LinkAction,
  PrimaryAction,
  Prose,
} from "../src/components/chrome";
import { PageScreen } from "../src/components/screen";
import { observationSummary } from "../src/domain/build-observation";
import type { Observation, StorageStatus } from "../src/domain/observation";
import { shortLabel, useFieldSession } from "../src/session/provider";
import { useObservations } from "../src/storage/use-observations";
import { useSync } from "../src/sync/provider";
import { colors, fonts, space, textStyles } from "../src/theme";

/**
 * The real queue states, labelled the way the field reads them. There is no "contested" state:
 * the API has no revisions and no download sync, so the collector never claims one.
 */
const STATES: Record<StorageStatus, { readonly label: string; readonly tone: ChipTone }> = {
  "local-only": { label: "On device only", tone: "muted" },
  pending: { label: "Held", tone: "live" },
  synced: { label: "Synced", tone: "accent" },
  "needs-attention": { label: "Needs attention", tone: "attention" },
};

function meta(record: Observation): string {
  const time = new Date(record.createdAt).toLocaleString();
  if (record.formVersion === "shell-v1") return `Practice form · ${record.observer} · ${time}`;
  return `${record.context.zoneLabel} · round ${record.context.round} · ${record.observer} · ${time}`;
}

export default function RecordsScreen() {
  const { records, loading, error, retry } = useObservations();
  const { retry: retryUploads, error: syncError } = useSync();
  const { sitePackage } = useFieldSession();
  const [busy, setBusy] = useState(false);

  const attention = records.filter((record) => record.storageStatus === "needs-attention").length;
  const waiting = records.filter((record) => record.storageStatus === "pending").length;
  const deviceOnly = records.filter((record) => record.storageStatus === "local-only").length;

  return (
    <PageScreen>
      <LinkAction
        label={sitePackage ? "← Back to the map" : "← Studies"}
        muted
        onPress={() => router.navigate(sitePackage ? "/field" : "/")}
        style={{ alignSelf: "flex-start" }}
      />
      <Text style={[textStyles.title, { color: colors.text, marginTop: space.snug }]}>
        On this device
      </Text>
      <Text style={[textStyles.meta, { color: colors.neutral400, marginTop: 3 }]}>
        {loading
          ? "Reading local records…"
          : `${waiting} held for signal · ${deviceOnly} on device only · ${records.length} in total`}
      </Text>

      {error !== null && (
        <View style={{ marginTop: space.base }}>
          <AttentionNote role="alert" title="Records could not be read" body={error} />
          <PrimaryAction label="Try again" onPress={retry} style={{ marginTop: space.snug }} />
        </View>
      )}
      {syncError !== "" && (
        <View style={{ marginTop: space.base }}>
          <AttentionNote role="alert" title="Synchronisation paused" body={syncError} />
        </View>
      )}

      <View style={{ marginTop: space.loose }}>
        {records.map((record) => {
          const state = STATES[record.storageStatus];
          return (
            <View
              key={record.id}
              style={{
                borderBottomWidth: 1,
                borderBottomColor: colors.ruleFaint,
                paddingVertical: space.base + 2,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: space.snug + 2,
                }}
              >
                <Text
                  selectable
                  style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.text }}
                >
                  {shortLabel(record.id)}
                </Text>
                <Chip label={state.label} tone={state.tone} />
              </View>
              <Text style={[textStyles.caption, { color: colors.neutral400, marginTop: 3 }]}>
                {meta(record)}
              </Text>
              <Text
                numberOfLines={2}
                style={[textStyles.caption, { color: colors.neutral300, marginTop: 3 }]}
              >
                {observationSummary(record)}
              </Text>
              {record.syncError !== "" && (
                <Text
                  accessibilityRole="alert"
                  style={[textStyles.caption, { color: colors.attentionText, marginTop: 4 }]}
                >
                  {record.syncError}
                </Text>
              )}
            </View>
          );
        })}
      </View>

      {records.length === 0 && !loading && (
        <View style={{ marginTop: space.base }}>
          <Prose>Your first observation starts with a point on the field map.</Prose>
        </View>
      )}

      {attention > 0 && (
        <View style={{ marginTop: space.loose }}>
          <AttentionNote
            title={`${attention} ${attention === 1 ? "record needs" : "records need"} attention`}
            body="The server refused these. They are kept exactly as you saved them; retrying puts them back in the queue."
          />
          <PrimaryAction
            label={busy ? "Please wait…" : "Retry these uploads"}
            disabled={busy}
            style={{ marginTop: space.snug }}
            onPress={() => {
              setBusy(true);
              void retryUploads().finally(() => setBusy(false));
            }}
          />
        </View>
      )}

      <FadeRule />
      <Prose tone="faint">
        Sync runs by itself whenever the device has signal and the app is open — there is no send
        button. Records that only exist on this device are either practice records or a form version
        the API does not accept yet. Closing the app pauses uploads until it opens again.
      </Prose>
      <GhostAction
        label="Account and synchronisation"
        onPress={() => router.push("/account")}
        style={{ marginTop: space.base }}
      />
    </PageScreen>
  );
}
