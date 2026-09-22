import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import {
  FadeRule,
  GhostAction,
  PrimaryAction,
  Prose,
  SectionLabel,
} from "../src/components/chrome";
import { PageScreen } from "../src/components/screen";
import { useFieldSession } from "../src/session/provider";
import { useObservations } from "../src/storage/use-observations";
import { colors, space, textStyles } from "../src/theme";

export default function SavedScreen() {
  const { held } = useLocalSearchParams<{ held?: string }>();
  const { sitePackage, form, zone, round } = useFieldSession();
  const { records } = useObservations();
  const heldOnly = held === "1";
  const waiting = records.filter((record) => record.storageStatus === "pending").length;

  return (
    <PageScreen>
      <View style={{ width: 30, height: 2, backgroundColor: colors.accent }} />
      <Text style={[textStyles.title, { color: colors.text, marginTop: space.base + 3 }]}>
        {heldOnly ? "Saved to the device" : "Saved and queued"}
      </Text>
      <View style={{ marginTop: 7, maxWidth: 460 }}>
        <Prose tone="body">
          {heldOnly
            ? form?.status === "draft"
              ? `This record uses form version ${form.version}, which the API does not accept yet. It stays on the device, intact, until that version is published.`
              : "Practice records stay on this device. Sign in to a project before collecting records that upload."
            : `It joins ${waiting} ${waiting === 1 ? "record" : "records"} waiting for signal. Sync happens by itself the moment this device has a connection and the app is open — there is nothing to remember to press.`}
        </Prose>
      </View>

      <FadeRule />
      <SectionLabel>Carried into the next observation</SectionLabel>
      <View style={{ gap: space.snug + 1, marginTop: space.snug + 2 }}>
        <Text style={[textStyles.body, { color: colors.text }]}>
          {zone?.label ?? "This zone"}, round {round}{" "}
          <Text style={{ color: colors.neutral500 }}>— kept</Text>
        </Text>
        <Text style={[textStyles.body, { color: colors.text }]}>
          Observer initials <Text style={{ color: colors.neutral500 }}>— kept</Text>
        </Text>
        <Text style={[textStyles.body, { color: colors.text }]}>
          Every event answer <Text style={{ color: colors.neutral500 }}>— cleared</Text>
        </Text>
      </View>
      <Text style={[textStyles.caption, { color: colors.neutral500, marginTop: space.snug }]}>
        Round climate and zone inventory are not collected yet, so no round snapshot is stamped onto
        this record.
      </Text>

      <FadeRule />
      <PrimaryAction
        label={`Next observation, ${zone ? "same zone" : "same site"}`}
        onPress={() => {
          if (router.canGoBack()) router.back();
          else router.navigate("/field");
        }}
      />
      <GhostAction
        label="Change zone or round"
        onPress={() => router.navigate("/brief")}
        style={{ marginTop: space.snug }}
      />
      <GhostAction
        label={`See the ${records.length} ${records.length === 1 ? "record" : "records"} on this device`}
        onPress={() => router.push("/records")}
        style={{ marginTop: space.tight }}
      />
      {sitePackage && (
        <Text style={[textStyles.micro, { color: colors.neutral600, marginTop: space.loose }]}>
          {sitePackage.name} · package {sitePackage.version}
        </Text>
      )}
    </PageScreen>
  );
}
