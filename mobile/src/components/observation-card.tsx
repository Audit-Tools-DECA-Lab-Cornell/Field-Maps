import { Text, View } from "react-native";
import type { Observation } from "../domain/observation";
import { colors } from "../theme";

export function ObservationCard({ record }: { readonly record: Observation }) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        padding: 18,
        gap: 10,
      }}
    >
      <View
        style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}
      >
        <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "600" }}>
          {record.people} {record.people === 1 ? "person" : "people"} observed
        </Text>
        <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "600" }}>
          {
            {
              "local-only": "PRACTICE · ON DEVICE",
              pending: "WAITING TO UPLOAD",
              synced: "UPLOADED",
              "needs-attention": "NEEDS ATTENTION",
            }[record.storageStatus]
          }
        </Text>
      </View>
      <Text selectable style={{ color: colors.muted, fontSize: 14 }}>
        {record.observer} · {new Date(record.createdAt).toLocaleString()}
      </Text>
      {record.syncError !== "" && (
        <Text accessibilityRole="alert" style={{ color: colors.error }}>
          {record.syncError}
        </Text>
      )}
      {record.notes !== "" && (
        <Text selectable style={{ color: colors.ink, fontSize: 15, lineHeight: 23 }}>
          {record.notes}
        </Text>
      )}
      <Text selectable style={{ color: colors.muted, fontSize: 12 }}>
        Latitude {record.coordinates[1].toFixed(6)} · Longitude {record.coordinates[0].toFixed(6)}
      </Text>
    </View>
  );
}
