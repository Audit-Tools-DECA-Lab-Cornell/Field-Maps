import { router } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActionButton } from "../src/components/action-button";
import { SiteMap } from "../src/maps/site-map";
import { useObservations } from "../src/storage/use-observations";
import { colors } from "../src/theme";

export default function SitesScreen() {
  const insets = useSafeAreaInsets();
  const { records, loading, error } = useObservations();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        padding: 24,
        paddingBottom: insets.bottom + 24,
        gap: 24,
        maxWidth: 680,
        width: "100%",
        alignSelf: "center",
      }}
    >
      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "700", letterSpacing: 1.5 }}>
          YOUR FIELD WORKSPACE
        </Text>
        <Text style={{ color: colors.ink, fontSize: 32, fontWeight: "600" }}>
          Ready to explore.
        </Text>
        <Text style={{ color: colors.muted, fontSize: 16, lineHeight: 24 }}>
          Open a site, place a point, and record what you see.
        </Text>
      </View>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 22,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View pointerEvents="none" style={{ height: 185 }}>
          <SiteMap preview />
        </View>
        <View style={{ padding: 22, gap: 14 }}>
          <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "700", letterSpacing: 1 }}>
            BUNDLED SAMPLE · AVAILABLE OFFLINE
          </Text>
          <Text style={{ color: colors.ink, fontSize: 24, fontWeight: "600" }}>Sample garden</Text>
          <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 23 }}>
            A fictional training map. Try the collection workflow before adding your QGIS site.
          </Text>
          <ActionButton label="Open site map" onPress={() => router.push("/collect")} />
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <Text style={{ color: colors.ink, fontSize: 20, fontWeight: "600" }}>
          Your observations
        </Text>
        <Text selectable style={{ color: colors.muted, fontSize: 15, lineHeight: 23 }}>
          {error
            ? "Saved records could not be loaded. Open the list to retry."
            : loading
              ? "Reading local records…"
              : `${records.length} saved on this device. Open the list to see upload status.`}
        </Text>
        <ActionButton
          label="View saved observations"
          secondary
          onPress={() => router.push("/observations")}
        />
      </View>
      <ActionButton
        label="Account and synchronization"
        secondary
        onPress={() => router.push("/account")}
      />
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 20, gap: 8 }}>
        <Text style={{ color: colors.ink, fontSize: 16, fontWeight: "600" }}>
          For tonight’s test
        </Text>
        <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 23 }}>
          Add an observation, then close and reopen the app. The sample map and saved record stay on
          this device.
        </Text>
      </View>
    </ScrollView>
  );
}
