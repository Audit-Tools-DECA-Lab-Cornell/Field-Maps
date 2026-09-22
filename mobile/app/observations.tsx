import { router } from "expo-router";
import { FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActionButton } from "../src/components/action-button";
import { ObservationCard } from "../src/components/observation-card";
import { useObservations } from "../src/storage/use-observations";
import { colors } from "../src/theme";

export default function ObservationsScreen() {
  const { records, loading, error, retry } = useObservations();
  const insets = useSafeAreaInsets();
  return (
    <FlatList
      data={records}
      keyExtractor={(record) => record.id}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        padding: 24,
        paddingBottom: insets.bottom + 24,
        gap: 14,
        maxWidth: 680,
        width: "100%",
        alignSelf: "center",
      }}
      renderItem={({ item }) => <ObservationCard record={item} />}
      ListHeaderComponent={
        <View style={{ gap: 12, paddingBottom: 12 }}>
          <Text selectable style={{ color: colors.ink, fontSize: 28, fontWeight: "600" }}>
            {records.length} saved {records.length === 1 ? "observation" : "observations"}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 23 }}>
            Records stay on this device. Each record shows whether the server has confirmed its
            upload.
          </Text>
          <ActionButton
            label="Account and upload settings"
            secondary
            onPress={() => router.push("/account")}
          />
          {error && (
            <>
              <Text selectable accessibilityRole="alert" style={{ color: colors.error }}>
                {error}
              </Text>
              <ActionButton label="Retry" onPress={retry} />
            </>
          )}
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <Text style={{ color: colors.muted }}>Reading local records…</Text>
        ) : !error ? (
          <View style={{ gap: 16, paddingVertical: 20 }}>
            <Text style={{ color: colors.muted, fontSize: 16, lineHeight: 24 }}>
              Your first observation starts with a point on the map.
            </Text>
            <ActionButton label="Open site map" onPress={() => router.push("/collect")} />
          </View>
        ) : null
      }
      ListFooterComponent={
        records.length > 0 ? (
          <ActionButton
            label="Back to site map"
            secondary
            onPress={() => router.navigate("/collect")}
          />
        ) : null
      }
    />
  );
}
