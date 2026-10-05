import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useGate } from "../src/features/auth/gate";
import { useQueue } from "../src/features/preview/data-source";
import { nothingLostNote } from "../src/features/projects/readiness";
import { StaticDock } from "../src/features/projects/StaticDock";
import { useUnfinished } from "../src/features/projects/UnfinishedCard";
import {
  Button,
  Icon,
  Note,
  Screen,
  ScreenHeader,
  Text,
  type Theme,
  useStyles,
  useTheme,
} from "../src/ui";

function notFoundStyles(t: Theme) {
  return StyleSheet.create({
    disc: {
      width: 96,
      height: 96,
      borderRadius: t.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.c.island,
      borderWidth: t.size.border,
      borderColor: t.c.line,
    },
    ledge: { paddingBottom: t.size.ledge, alignSelf: "flex-start" },
    ledgeBand: {
      position: "absolute",
      left: 0,
      right: 0,
      top: t.size.ledge,
      bottom: 0,
      borderRadius: t.radius.pill,
      backgroundColor: t.c.ledge,
    },
    body: { gap: t.space.s6, marginTop: t.space.s6 },
    heading: { gap: t.space.s3 },
    actions: { gap: t.space.s3 },
    spacer: { flexGrow: 1, minHeight: t.space.s6 },
  });
}

/**
 * The collector's 404 (Mobile 22): a link that leads nowhere. It says where to go and that nothing was
 * lost, naming the records on this device and an unfinished observation, and keeps the dock. Signed out,
 * "Return to projects" leads to sign-in, and there is no dock to show.
 */
export default function NotFound() {
  const s = useStyles(notFoundStyles);
  const t = useTheme();
  const gate = useGate();
  const { records } = useQueue();
  const unfinished = useUnfinished();
  const inApp = gate.route === "app";
  const note = nothingLostNote(records.length, unfinished !== null);

  return (
    <View style={{ flex: 1 }}>
      <Screen scroll dock={inApp} testID="not-found">
        <ScreenHeader showOnline />
        <View style={s.body}>
          <View style={s.ledge}>
            <View style={s.ledgeBand} />
            <View style={s.disc}>
              <Icon name="map" size={36} color={t.c.ink} />
            </View>
          </View>
          <View style={s.heading}>
            <Text variant="monoLabel" tone="ink2">
              404 · Page not found
            </Text>
            <Text variant="page" header>
              This page is not on the map.
            </Text>
            <Text tone="ink2">
              The link may be outdated or the page may have moved. Return to your projects to
              continue.
            </Text>
          </View>
          <View style={s.actions}>
            <Button
              label="Return to projects"
              icon="arrow-left"
              fullWidth
              onPress={() => router.replace("/")}
              testID="not-found-projects"
            />
            {inApp ? (
              <Button
                variant="outline"
                label="Open observations"
                icon="list"
                fullWidth
                onPress={() => router.replace("/observations")}
              />
            ) : null}
          </View>
          <View style={s.spacer} />
          <Note tone="saved" icon="smartphone" title={note.title}>
            {note.body}
          </Note>
        </View>
      </Screen>
      {inApp ? <StaticDock /> : null}
    </View>
  );
}
