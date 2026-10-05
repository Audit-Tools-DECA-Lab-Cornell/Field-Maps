import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import type { Answers } from "../../forms/definition";
import { isAnswered, visibleQuestions } from "../../forms/engine";
import { formFor } from "../../forms/registry";
import { useFieldSession } from "../../session/provider";
import {
  announce,
  Button,
  Island,
  Text,
  TextLink,
  type Theme,
  useHaptics,
  useStyles,
} from "../../ui";
import { useDataSource } from "../preview/data-source";
import { unfinishedSentence, unfinishedTitle } from "./readiness";

/** The bundled package the preview's sample draft belongs to (Riverside, as Mobile 10 draws it). */
const PREVIEW_PACKAGE = "riverside-play-study";

type Unfinished = {
  /** recovered: a draft left by a force quit; open: an observation still open in this session. */
  kind: "recovered" | "open" | "sample";
  title: string;
  sentence: string;
};

function countAnswered(answers: Answers): number {
  return Object.values(answers).filter((value) => isAnswered(value)).length;
}

const NOT_REOPENED = "This draft could not be reopened here. It stays on this device.";

/**
 * The unfinished observation the field session holds, if any: a draft recovered after a force quit
 * first (it is offered back before anything else), then an observation still open. Preview data shows
 * the designed sample when the device has neither.
 */
export function useUnfinished(): Unfinished | null {
  const session = useFieldSession();
  const { mode } = useDataSource();
  const { recovered, inProgress } = session;

  if (recovered) {
    const form = formFor(recovered.formVersion);
    return {
      kind: "recovered",
      title: unfinishedTitle(recovered.context.zoneLabel, recovered.context.round),
      sentence: unfinishedSentence({
        placed: recovered.coordinates !== null,
        answered: countAnswered(recovered.answers),
        asked: form ? visibleQuestions(form, recovered.answers).length : 0,
      }),
    };
  }
  if (inProgress) {
    const answers = session.state.answers;
    return {
      kind: "open",
      title: unfinishedTitle(session.zone?.label ?? inProgress.packageName, session.round),
      sentence: unfinishedSentence({
        placed: session.placed !== null,
        answered: countAnswered(answers),
        asked: session.form ? visibleQuestions(session.form, answers).length : 0,
      }),
    };
  }
  if (mode === "preview")
    return {
      kind: "sample",
      title: "North meadow · Round 1",
      sentence: "Point placed, 3 of 8 answered. Kept on this device.",
    };
  return null;
}

function cardStyles(t: Theme) {
  return StyleSheet.create({
    body: { gap: t.space.s5 },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      columnGap: t.space.s6,
      rowGap: t.space.s3,
    },
  });
}

/**
 * "Unfinished observation" on Projects (Mobile 10): the accent card for the one thing to pick up again.
 * Resume returns to collect with every answer as it was written; "Discard draft" asks first, because
 * it removes the point and answers from this device.
 */
export function UnfinishedCard({ unfinished }: { unfinished: Unfinished }) {
  const s = useStyles(cardStyles);
  const session = useFieldSession();
  const haptics = useHaptics();
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  if (hidden) return null;

  async function resume() {
    if (busy) return;
    setProblem(null);
    if (unfinished.kind === "open") {
      router.push("/collect");
      return;
    }
    setBusy(true);
    try {
      if (unfinished.kind === "recovered") {
        const opened = await session.resumeRecovered();
        if (opened) router.push("/collect");
        else {
          // Another account's draft leaves the card; a package this device no longer has keeps it.
          setProblem(NOT_REOPENED);
          announce(NOT_REOPENED);
        }
        return;
      }
      // Preview: the sample has no answers to restore, so collect opens on its bundled package.
      const outcome = await session.openPackage(PREVIEW_PACKAGE);
      if (outcome.ok) router.push("/collect");
      else {
        setProblem(outcome.reason);
        announce(outcome.reason);
      }
    } finally {
      setBusy(false);
    }
  }

  function discard() {
    Alert.alert(
      "Discard this draft?",
      "The point and answers in this unfinished observation are removed from this device. Nothing was uploaded.",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Discard draft",
          style: "destructive",
          onPress: () => {
            haptics.warning();
            if (unfinished.kind === "recovered") void session.discardRecovered();
            else if (unfinished.kind === "open") session.discard();
            else setHidden(true);
            announce("Draft discarded.");
          },
        },
      ],
    );
  }

  return (
    <Island tone="accent" eyebrow="Unfinished observation" title={unfinished.title}>
      <View style={s.body}>
        <Text tone="ink2">{unfinished.sentence}</Text>
        {problem ? <Text tone="attention">{problem}</Text> : null}
        <View style={s.actions}>
          <Button
            label="Resume"
            icon="arrow-right"
            busy={busy}
            busyLabel="Opening…"
            onPress={() => void resume()}
            accessibilityHint="Returns to collect with the point and answers as they were."
            testID="projects-resume"
          />
          <TextLink
            label="Discard draft"
            tone="ink"
            onPress={discard}
            accessibilityHint="Asks before removing the draft from this device."
            testID="projects-discard"
          />
        </View>
      </View>
    </Island>
  );
}
