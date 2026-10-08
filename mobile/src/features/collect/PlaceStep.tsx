import { ScrollView, StyleSheet, View } from "react-native";
import { type RoundType, roundLabel } from "../../domain/rounds";
import { metresPerPixel } from "../../maps/clustering";
import {
  formatCoordinate,
  PRECISE_METRES_PER_PIXEL,
  placementPrecision,
} from "../../maps/geometry";
import type { SiteZone } from "../../maps/sample-site";
import {
  Button,
  Icon,
  IconButton,
  Mono,
  Note,
  Text,
  TextLink,
  type Theme,
  useStyles,
  useTheme,
} from "../../ui";
import type { AimStore } from "./aim-store";
import { useAimZone } from "./CollectMap";

type Direction = "north" | "south" | "east" | "west";

type Props = {
  readonly aim: AimStore;
  readonly zones: readonly SiteZone[];
  readonly zone: SiteZone;
  readonly roundType: RoundType;
  /** True when moving a point that is already placed: the answers stay. */
  readonly adjusting: boolean;
  readonly lastSaved: string | null;
  readonly onPlace: () => void;
  readonly onKeep: () => void;
  readonly onNudge: (direction: Direction) => void;
  readonly onZoomIn: () => void;
  readonly onSwitchZone: (zone: SiteZone) => void;
};

/** Half a metre: finer than a child's footprint, coarse enough to move in a few taps. */
export const NUDGE_METRES = 0.5;

const NUDGES: readonly {
  direction: Direction;
  icon: "arrow-left" | "arrow-up" | "arrow-down" | "arrow-right";
}[] = [
  { direction: "west", icon: "arrow-left" },
  { direction: "north", icon: "arrow-up" },
  { direction: "south", icon: "arrow-down" },
  { direction: "east", icon: "arrow-right" },
];

function placeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1, minHeight: 0 },
    body: { paddingTop: t.space.s4, paddingBottom: t.space.s4, gap: t.space.s4 },
    where: { flexDirection: "row", alignItems: "center", gap: t.space.s2 },
    coords: {
      gap: 2,
      padding: t.space.s3,
      borderRadius: t.radius.panel,
      backgroundColor: t.c.well,
    },
    nudgeRow: { flexDirection: "row", alignItems: "center", gap: t.space.s2, flexWrap: "wrap" },
    actions: {
      gap: t.space.s3,
      paddingTop: t.space.s3,
      borderTopWidth: t.size.border,
      borderTopColor: t.c.rule,
    },
  });
}

/**
 * Place (MOB-26, Janet's placement): the map moves under a fixed cross, the readout says where the
 * cross is and whether it is inside the session's zone, and nothing is placed until "Place point
 * here". Every gesture has a button beside it: the nudge pad moves the map half a metre at a time.
 */
export function PlaceStep({
  aim,
  zones,
  zone,
  roundType,
  adjusting,
  lastSaved,
  onPlace,
  onKeep,
  onNudge,
  onZoomIn,
  onSwitchZone,
}: Props) {
  const s = useStyles(placeStyles);
  const t = useTheme();
  const { centre, zoom, inside, moving } = useAimZone(aim, zones, zone);
  const inZone = inside?.id === zone.id;
  const coarse = metresPerPixel(zoom, centre[1]) > PRECISE_METRES_PER_PIXEL;

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.body}>
        <View style={{ gap: 4 }}>
          <Mono variant="label" tone="accent">
            {adjusting
              ? `Adjust point · ${roundLabel(roundType)}`
              : `Next observation · ${roundLabel(roundType)}`}
          </Mono>
          <Text variant="island" header>
            {adjusting ? "Move the × to the right spot" : "Put the × on the play"}
          </Text>
          <Text tone="ink2">
            Move the map until the cross sits where the play is happening. The pin lifts while the
            map moves, so the spot itself is never covered. Tap the map to jump the cross there.
          </Text>
        </View>

        <View
          style={s.where}
          accessible
          accessibilityLiveRegion="polite"
          accessibilityLabel={
            inZone
              ? `The cross is in ${zone.label}.`
              : inside
                ? `The cross is outside ${zone.label}, in ${inside.label}.`
                : `The cross is outside ${zone.label}.`
          }
        >
          <Icon
            name={inZone ? "check" : "triangle-alert"}
            size={18}
            color={inZone ? t.c.saved : t.c.waiting}
          />
          <Text variant="smallStrong" tone={inZone ? "saved" : "waiting"}>
            {inZone
              ? `In ${zone.label}`
              : inside
                ? `Outside ${zone.label} · in ${inside.label}`
                : `Outside ${zone.label}`}
          </Text>
        </View>
        {!inZone && inside ? (
          <Button
            variant="outline"
            icon="map"
            label={`Switch to ${inside.label}`}
            onPress={() => onSwitchZone(inside)}
          />
        ) : null}

        <View
          style={s.coords}
          accessible
          accessibilityLabel={`Coordinates ${formatCoordinate(centre)}`}
        >
          <Mono variant="data">{formatCoordinate(centre)}</Mono>
          <Text variant="small" tone="ink2">
            {moving ? "Moving…" : `Placed by hand · ${placementPrecision(zoom, centre[1])}`}
          </Text>
        </View>

        {coarse ? (
          <Note
            tone="neutral"
            icon="search"
            action={<TextLink label="Zoom in to place" icon="plus" onPress={onZoomIn} />}
          >
            Zoom in for a finer point: each step of the screen covers more than a footprint here.
          </Note>
        ) : null}

        <View style={{ gap: 8 }}>
          <Text variant="smallStrong">Fine-tune</Text>
          <View style={s.nudgeRow}>
            {NUDGES.map(({ direction, icon }) => (
              <IconButton
                key={direction}
                variant="outline"
                icon={icon}
                label={`Move the cross ${direction} by half a metre`}
                onPress={() => onNudge(direction)}
              />
            ))}
            <Text variant="small" tone="ink2">
              Half a metre a tap
            </Text>
          </View>
        </View>

        {lastSaved ? (
          <Text variant="small" tone="ink2">
            {`Last saved on this device · ${lastSaved}`}
          </Text>
        ) : null}
      </ScrollView>

      <View style={s.actions}>
        <Button
          label={adjusting ? "Move the point here" : "Place point here"}
          icon="crosshair"
          size="collector"
          fullWidth
          onPress={onPlace}
          accessibilityHint={`Places the observation at ${formatCoordinate(centre)}.`}
          testID="collect-place"
        />
        {adjusting ? (
          <TextLink label="Keep the point where it was" arrow="left" onPress={onKeep} />
        ) : null}
      </View>
    </View>
  );
}
