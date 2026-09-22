import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActionButton } from "../src/components/action-button";
import type { Coordinate } from "../src/domain/observation";
import { SiteMap } from "../src/maps/site-map";
import { useObservations } from "../src/storage/use-observations";
import { colors } from "../src/theme";

export default function CollectScreen() {
  const [selected, setSelected] = useState<Coordinate | null>(null);
  const { records, loading, error, retry } = useObservations();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.soft }}>
        <Text style={{ color: colors.ink, fontSize: 13 }}>
          Training map · No internet or GPS needed
        </Text>
      </View>
      <SiteMap records={records} selected={selected} onSelect={setSelected} />
      <View
        style={{
          backgroundColor: colors.canvas,
          padding: 20,
          paddingBottom: insets.bottom + 16,
          gap: 12,
        }}
      >
        <View style={{ maxWidth: 640, width: "100%", alignSelf: "center", gap: 12 }}>
          <Text style={{ color: colors.ink, fontSize: 21, fontWeight: "600" }}>
            {selected ? "Record what’s here" : "Where is the observation?"}
          </Text>
          <Text selectable style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>
            {selected
              ? `Latitude ${selected[1].toFixed(6)} · Longitude ${selected[0].toFixed(6)}`
              : "Tap the map to place a point. Pinch to zoom for a closer look."}
          </Text>
          {error ? (
            <>
              <Text accessibilityRole="alert" style={{ color: colors.error }}>
                Saved points could not be loaded.
              </Text>
              <ActionButton label="Retry loading points" secondary onPress={retry} />
            </>
          ) : (
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              {loading
                ? "Loading saved points…"
                : `${records.length} ${records.length === 1 ? "observation" : "observations"} on this device`}
            </Text>
          )}
          <ActionButton
            label="Add observation here"
            disabled={!selected}
            onPress={() => {
              if (selected)
                router.push({
                  pathname: "/observe",
                  params: { longitude: selected[0], latitude: selected[1] },
                });
            }}
          />
        </View>
      </View>
    </View>
  );
}
