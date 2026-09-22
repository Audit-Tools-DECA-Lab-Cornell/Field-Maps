import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Layer,
  Marker,
  Map as NativeMap,
} from "@maplibre/maplibre-react-native";
import { type ReactElement, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Glass, MapPill, MapSquareButton } from "../components/chrome";
import { type Coordinate, coordinateSchema } from "../domain/observation";
import type { LayerPaint, PackageLayer, SitePackage } from "../packages/site-package";
import { colors, fonts, radius, space, textStyles } from "../theme";
import { clusterPoints, type MapPoint, nudge, scaleLabel } from "./clustering";
import type { SiteZone } from "./sample-site";

/** A prior observation as the map needs it: where it is and what the callout should say. */
export type MapRecord = MapPoint & {
  readonly label: string;
  readonly time: string;
  readonly summary: string;
};

type Props = {
  readonly sitePackage: SitePackage;
  readonly zone: SiteZone;
  readonly records: readonly MapRecord[];
  readonly placed: Coordinate | null;
  readonly armed: boolean;
  readonly heldLabel: string;
  readonly onPlace: (coordinate: Coordinate) => void;
  readonly onNudge: (coordinate: Coordinate) => void;
  readonly onBack: () => void;
};

const NUDGE_METRES = 0.5;

/**
 * Layers are returned as an array rather than a fragment: the source clones each direct child to
 * hand it its source, and a fragment would swallow that for the elements inside it.
 */
function layerElements(paint: LayerPaint, visible: boolean, id: string): readonly ReactElement[] {
  const layout = { visibility: visible ? ("visible" as const) : ("none" as const) };
  if (paint.type === "line")
    return [
      <Layer
        key={`${id}-line`}
        id={`${id}-line`}
        type="line"
        layout={{ ...layout, "line-cap": "round", "line-join": "round" }}
        paint={{ "line-color": paint.color, "line-width": paint.width }}
      />,
    ];
  if (paint.type === "circle")
    return [
      <Layer
        key={`${id}-circle`}
        id={`${id}-circle`}
        type="circle"
        layout={layout}
        paint={{ "circle-color": paint.color, "circle-radius": paint.radius }}
      />,
    ];
  return [
    <Layer
      key={`${id}-fill`}
      id={`${id}-fill`}
      type="fill"
      layout={layout}
      paint={{ "fill-color": paint.color }}
    />,
    <Layer
      key={`${id}-outline`}
      id={`${id}-outline`}
      type="line"
      layout={layout}
      paint={{
        "line-color": paint.outline,
        "line-width": 1.5,
        ...(paint.dashed ? { "line-dasharray": [3, 2] } : {}),
      }}
    />,
  ];
}

/**
 * The field map. Navigating and marking are separate modes: every tap pans, selects or does
 * nothing until "Place a point" is armed, so a gloved thumb can never drop an observation.
 *
 * Chrome sits on translucent glass above the map and takes its own touches — it never reaches
 * the map underneath, so no control can place a point.
 */
export function FieldMap({
  sitePackage,
  zone,
  records,
  placed,
  armed,
  heldLabel,
  onPlace,
  onNudge,
  onBack,
}: Props) {
  const camera = useRef<CameraRef>(null);
  const [base, setBase] = useState<"plan" | "aerial">("plan");
  const [layersOpen, setLayersOpen] = useState(false);
  const [hidden, setHidden] = useState<readonly string[]>([]);
  const [zoom, setZoom] = useState(17.4);
  const [selected, setSelected] = useState<string | null>(null);

  const clusters = useMemo(() => clusterPoints(records, zoom), [records, zoom]);
  const selectedRecord = records.find((record) => record.id === selected) ?? null;
  const isVisible = (layer: PackageLayer) => !hidden.includes(layer.id);

  function move(direction: "north" | "south" | "east" | "west") {
    if (!placed) return;
    onNudge(nudge(placed, direction, NUDGE_METRES));
  }

  return (
    <View
      style={{
        flex: 1,
        borderRadius: radius.lg - 2,
        overflow: "hidden",
        backgroundColor: colors.mapGround,
      }}
    >
      <NativeMap
        mapStyle={base === "plan" ? sitePackage.bases.plan : sitePackage.bases.aerial}
        style={{ flex: 1 }}
        dragPan={!armed}
        touchRotate={false}
        touchPitch={false}
        attribution={false}
        logo={false}
        compass={false}
        onRegionDidChange={(event) => setZoom(event.nativeEvent.zoom)}
        onPress={(event) => {
          if (!armed) return;
          const parsed = coordinateSchema.safeParse(event.nativeEvent.lngLat);
          if (parsed.success) onPlace(parsed.data);
        }}
      >
        <Camera
          ref={camera}
          initialViewState={{ center: zone.centre, zoom: 17.4 }}
          minZoom={15.5}
          maxZoom={21}
          maxBounds={sitePackage.bounds}
        />
        {sitePackage.layers.map((layer) => (
          <GeoJSONSource key={layer.id} id={`package-${layer.id}`} data={layer.data}>
            {layerElements(base === "plan" ? layer.plan : layer.aerial, isVisible(layer), layer.id)}
          </GeoJSONSource>
        ))}
        {clusters.map((cluster) =>
          cluster.kind === "cluster" ? (
            <Marker key={cluster.id} id={cluster.id} lngLat={cluster.coordinates}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${cluster.count} observations here. Zoom in to separate them.`}
                onPress={() => {
                  setSelected(null);
                  camera.current?.easeTo({
                    center: cluster.coordinates,
                    zoom: Math.min(zoom + 1.6, 21),
                    duration: 260,
                  });
                }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.accent700,
                  borderWidth: 2,
                  borderColor: colors.accent300,
                  shadowColor: "#000",
                  shadowOpacity: 0.75,
                  shadowRadius: 5,
                  shadowOffset: { width: 0, height: 2 },
                }}
              >
                <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.accent100 }}>
                  {cluster.count}
                </Text>
              </Pressable>
            </Marker>
          ) : (
            <Marker key={cluster.id} id={cluster.id} lngLat={cluster.coordinates}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Observation ${
                  records.find((record) => record.id === cluster.id)?.label ?? ""
                }`}
                onPress={() => setSelected(cluster.id)}
                hitSlop={10}
                style={{ alignItems: "center" }}
              >
                <View
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: selected === cluster.id ? colors.accent300 : colors.accent600,
                    borderWidth: 2,
                    borderColor: selected === cluster.id ? colors.accent100 : colors.accent300,
                    shadowColor: "#000",
                    shadowOpacity: 0.8,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 1 },
                  }}
                />
                {zoom >= 18.6 && (
                  <Text
                    style={[
                      textStyles.micro,
                      {
                        marginTop: 2,
                        color: colors.neutral200,
                        textShadowColor: "#000",
                        textShadowRadius: 3,
                      },
                    ]}
                  >
                    {records.find((record) => record.id === cluster.id)?.label ?? ""}
                  </Text>
                )}
              </Pressable>
            </Marker>
          ),
        )}
        {placed && (
          <Marker id="placed-observation" lngLat={placed}>
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                borderWidth: 2,
                borderColor: colors.accent100,
                backgroundColor: "#9184d966",
                shadowColor: colors.accent,
                shadowOpacity: 0.9,
                shadowRadius: 9,
                shadowOffset: { width: 0, height: 0 },
              }}
            />
          </Marker>
        )}
      </NativeMap>

      {/* Context, top left. */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: space.snug,
          left: space.snug,
          flexDirection: "row",
          gap: space.tight,
          alignItems: "center",
        }}
      >
        <MapPill
          label={`← ${zone.label}`}
          onPress={onBack}
          accessibilityLabel="Change zone or round"
        />
        <MapPill label={heldLabel} />
      </View>

      {/* Base and layers, top right. */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: space.snug,
          right: space.snug,
          alignItems: "flex-end",
          gap: space.tight,
        }}
      >
        <View style={{ flexDirection: "row", gap: space.tight }}>
          <MapPill
            label={base === "aerial" ? "Aerial" : "Plan"}
            active={base === "aerial"}
            onPress={() => setBase(base === "plan" ? "aerial" : "plan")}
            accessibilityLabel="Switch base map"
          />
          <MapPill label="Layers" active={layersOpen} onPress={() => setLayersOpen(!layersOpen)} />
        </View>
        {layersOpen && (
          <Glass style={{ padding: space.tight, minWidth: 176, gap: 2 }}>
            {sitePackage.layers.map((layer) => {
              const on = isVisible(layer);
              return (
                <Pressable
                  key={layer.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() =>
                    setHidden(
                      on ? [...hidden, layer.id] : hidden.filter((entry) => entry !== layer.id),
                    )
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: space.snug + 1,
                    minHeight: 42,
                    paddingHorizontal: space.snug,
                    borderRadius: radius.sm + 2,
                    backgroundColor: on ? "#9184d91f" : "transparent",
                  }}
                >
                  <View
                    style={{
                      width: 3,
                      height: 15,
                      borderRadius: 2,
                      backgroundColor: on ? colors.accent : colors.rule,
                    }}
                  />
                  <Text
                    style={[
                      textStyles.meta,
                      { color: on ? colors.accent200 : colors.neutral400, flex: 1 },
                    ]}
                  >
                    {layer.name}
                  </Text>
                </Pressable>
              );
            })}
          </Glass>
        )}
      </View>

      {/* Navigation and scale, bottom right — away from the layer and collapse controls. */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          right: space.snug,
          bottom: space.snug,
          alignItems: "flex-end",
          gap: space.tight,
        }}
      >
        <MapSquareButton
          glyph="+"
          accessibilityLabel="Zoom in"
          onPress={() => camera.current?.zoomTo(Math.min(zoom + 1, 21), { duration: 220 })}
        />
        <MapSquareButton
          glyph="−"
          accessibilityLabel="Zoom out"
          onPress={() => camera.current?.zoomTo(Math.max(zoom - 1, 15.5), { duration: 220 })}
        />
        <MapSquareButton
          glyph="◎"
          accessibilityLabel="Recentre on this zone"
          onPress={() => camera.current?.easeTo({ center: zone.centre, zoom: 17.4, duration: 280 })}
        />
        <MapPill label={scaleLabel(zoom, zone.centre[1])} />
      </View>

      {/* The callout is anchored to the bottom edge so it never covers what was tapped. */}
      {selectedRecord && (
        <View
          pointerEvents="box-none"
          style={{ position: "absolute", left: space.snug, bottom: space.snug, maxWidth: 280 }}
        >
          <Glass style={{ padding: space.base }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: space.base,
                alignItems: "baseline",
              }}
            >
              <Text style={{ fontFamily: fonts.medium, fontSize: 13.5, color: colors.text }}>
                {selectedRecord.label}
              </Text>
              <Text style={[textStyles.micro, { color: colors.neutral400 }]}>
                {selectedRecord.time}
              </Text>
            </View>
            <Text
              numberOfLines={3}
              style={[textStyles.caption, { color: colors.neutral300, marginTop: 4 }]}
            >
              {selectedRecord.summary}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSelected(null)}
              style={{ minHeight: 36, justifyContent: "flex-end" }}
            >
              <Text style={[textStyles.caption, { color: colors.neutral400 }]}>Close</Text>
            </Pressable>
          </Glass>
        </View>
      )}

      {/* Nudging the placed point: hand placement stays authoritative. */}
      {placed && !armed && (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            bottom: space.snug,
            left: 0,
            right: 0,
            alignItems: "center",
          }}
        >
          <Glass
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space.tight,
              paddingHorizontal: space.snug,
              paddingVertical: space.tight,
            }}
          >
            <Text style={[textStyles.micro, { color: colors.neutral400 }]}>Nudge</Text>
            {(
              [
                ["west", "←"],
                ["north", "↑"],
                ["south", "↓"],
                ["east", "→"],
              ] as const
            ).map(([direction, glyph]) => (
              <Pressable
                key={direction}
                accessibilityRole="button"
                accessibilityLabel={`Move the point ${direction} by half a metre`}
                onPress={() => move(direction)}
                hitSlop={6}
                style={({ pressed }) => ({
                  width: 34,
                  height: 34,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: radius.sm + 2,
                  backgroundColor: pressed ? colors.accent800 : "#ffffff10",
                })}
              >
                <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.accent200 }}>
                  {glyph}
                </Text>
              </Pressable>
            ))}
          </Glass>
        </View>
      )}

      {armed && (
        <View
          pointerEvents="none"
          style={{ position: "absolute", top: 52, left: 0, right: 0, alignItems: "center" }}
        >
          <View
            style={{
              backgroundColor: "#3a2f22e6",
              borderRadius: radius.md,
              paddingHorizontal: space.base,
              paddingVertical: 7,
              maxWidth: "88%",
            }}
          >
            <Text
              accessibilityRole="alert"
              style={[textStyles.caption, { color: "#f0d3ad", textAlign: "center" }]}
            >
              Tap the child’s position — the map will not pan while this is on
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
