import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Layer,
  Map as NativeMap,
} from "@maplibre/maplibre-react-native";
import type { FeatureCollection, Point } from "geojson";
import { useRef } from "react";
import { View } from "react-native";
import { ActionButton } from "../components/action-button";
import { type Coordinate, coordinateSchema, type Observation } from "../domain/observation";
import { sampleBounds, sampleCenter, sampleStyle } from "./sample-site";

type Props = {
  readonly records?: readonly Observation[];
  readonly selected?: Coordinate | null;
  readonly onSelect?: (coordinate: Coordinate) => void;
  readonly preview?: boolean;
};

export function SiteMap({ records = [], selected = null, onSelect, preview = false }: Props) {
  const camera = useRef<CameraRef>(null);
  const points: FeatureCollection<Point> = {
    type: "FeatureCollection",
    features: records.map((record) => ({
      type: "Feature",
      properties: { id: record.id },
      geometry: { type: "Point", coordinates: record.coordinates },
    })),
  };
  return (
    <View style={{ flex: 1 }}>
      <NativeMap
        mapStyle={sampleStyle}
        style={{ flex: 1 }}
        dragPan={!preview}
        touchZoom={!preview}
        touchRotate={false}
        touchPitch={false}
        attribution={false}
        onPress={(event) => {
          if (preview) return;
          const parsed = coordinateSchema.safeParse(event.nativeEvent.lngLat);
          if (parsed.success) onSelect?.(parsed.data);
        }}
      >
        <Camera
          ref={camera}
          initialViewState={{ center: sampleCenter, zoom: preview ? 16.5 : 17.2 }}
          minZoom={15.5}
          maxZoom={21}
          maxBounds={sampleBounds}
        />
        <GeoJSONSource id="observations" data={points}>
          <Layer
            id="observation-points"
            type="circle"
            paint={{
              "circle-color": "#21694F",
              "circle-radius": 7,
              "circle-stroke-color": "#FFFFFF",
              "circle-stroke-width": 2,
            }}
          />
        </GeoJSONSource>
        {selected && (
          <GeoJSONSource
            id="selected-point"
            data={{
              type: "Feature",
              properties: {},
              geometry: { type: "Point", coordinates: selected },
            }}
          >
            <Layer
              id="selection"
              type="circle"
              paint={{
                "circle-color": "#D47A34",
                "circle-radius": 10,
                "circle-stroke-color": "#FFFFFF",
                "circle-stroke-width": 3,
              }}
            />
          </GeoJSONSource>
        )}
      </NativeMap>
      {!preview && (
        <View style={{ position: "absolute", top: 14, right: 14 }}>
          <ActionButton
            label="Recenter"
            secondary
            onPress={() => {
              camera.current?.easeTo({ center: sampleCenter, zoom: 17.2, duration: 300 });
            }}
          />
        </View>
      )}
    </View>
  );
}
