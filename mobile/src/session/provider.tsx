import { randomUUID } from "expo-crypto";
import { useSQLiteContext } from "expo-sqlite";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAccount } from "../auth/provider";
import { buildObservation } from "../domain/build-observation";
import type { Coordinate, Placement, RoundContext } from "../domain/observation";
import type { Answers, FormDefinition } from "../forms/definition";
import { type ReviewProblem, reviewProblems } from "../forms/engine";
import { carriedAnswers } from "../forms/fixtures/janet-test-v1";
import { formFor, isUploadable } from "../forms/registry";
import {
  reduceSession,
  type SessionAction,
  type SessionState,
  type SessionStep,
  startSession,
} from "../forms/session";
import type { SiteZone } from "../maps/sample-site";
import { bundledPackages } from "../packages/bundled";
import type { SitePackage } from "../packages/site-package";
import {
  clearDraft,
  type ObservationDraft,
  observationDraftSchema,
  readDraft,
  saveDraft,
} from "../storage/draft-store";
import { saveObservation } from "../storage/observation-store";
import { useSync } from "../sync/provider";

/**
 * One observation period: the package, the zone and round it is stamped with, and the
 * observation currently being answered.
 *
 * Every change writes the draft to SQLite immediately, so a force quit costs nothing and the
 * upload queue never sees a half-answered form.
 */

export type SaveOutcome =
  | { readonly ok: true; readonly heldOnly: boolean }
  | { readonly ok: false; readonly problems: readonly ReviewProblem[]; readonly message?: string };

type FieldSessionValue = {
  readonly sitePackage: SitePackage | null;
  readonly form: FormDefinition | null;
  readonly zone: SiteZone | null;
  readonly round: number;
  readonly freshPeriod: boolean;
  readonly placed: Coordinate | null;
  readonly armed: boolean;
  readonly state: SessionState;
  readonly status: string;
  readonly recovered: ObservationDraft | null;
  readonly context: RoundContext | null;
  openPackage: (id: string) => Promise<SitePackage | undefined>;
  chooseZone: (zone: SiteZone) => void;
  chooseRound: (round: number) => void;
  toggleFreshPeriod: () => void;
  setArmed: (armed: boolean) => void;
  place: (coordinate: Coordinate) => void;
  nudgeTo: (coordinate: Coordinate) => void;
  dispatch: (action: SessionAction) => SessionStep;
  save: () => Promise<SaveOutcome>;
  discard: () => void;
  resumeRecovered: () => Promise<SitePackage | undefined>;
  discardRecovered: () => Promise<void>;
  announce: (message: string) => void;
};

const missing: FieldSessionValue = {
  sitePackage: null,
  form: null,
  zone: null,
  round: 1,
  freshPeriod: false,
  placed: null,
  armed: false,
  state: startSession(),
  status: "",
  recovered: null,
  context: null,
  openPackage: async () => undefined,
  chooseZone: () => {},
  chooseRound: () => {},
  toggleFreshPeriod: () => {},
  setArmed: () => {},
  place: () => {},
  nudgeTo: () => {},
  dispatch: () => ({ state: startSession(), destination: "stay", autoAdvance: false }),
  save: async () => ({ ok: false, problems: [] }),
  discard: () => {},
  resumeRecovered: async () => undefined,
  discardRecovered: async () => {},
  announce: () => {},
};

const FieldSessionContext = createContext(missing);

export function shortLabel(id: string): string {
  return `OBS-${id.slice(0, 6).toUpperCase()}`;
}

export function FieldSessionProvider({ children }: PropsWithChildren) {
  const database = useSQLiteContext();
  const { key, ready } = useAccount();
  const { wake } = useSync();

  const [sitePackage, setSitePackage] = useState<SitePackage | null>(null);
  const [zone, setZone] = useState<SiteZone | null>(null);
  const [round, setRound] = useState(1);
  const [freshPeriod, setFreshPeriod] = useState(false);
  const [placed, setPlaced] = useState<Coordinate | null>(null);
  const [armed, setArmed] = useState(false);
  const [state, setState] = useState<SessionState>(startSession());
  const [status, setStatus] = useState("Offline-first collector ready.");
  const [recovered, setRecovered] = useState<ObservationDraft | null>(null);

  const stateRef = useRef(state);
  const identity = useRef<{ id: string; startedAt: string } | null>(null);
  const form = sitePackage ? (formFor(sitePackage.formVersion) ?? null) : null;

  const context: RoundContext | null =
    sitePackage && zone
      ? {
          packageId: sitePackage.id,
          packageVersion: sitePackage.version,
          zoneId: zone.id,
          zoneLabel: zone.label,
          round,
          freshPeriod,
          inheritedFrom: freshPeriod ? "" : sitePackage.inheritedContext,
        }
      : null;

  const persist = useCallback(
    (next: SessionState, coordinate: Coordinate | null) => {
      if (!ready || !sitePackage || !context || !identity.current) return;
      const draft = observationDraftSchema.safeParse({
        id: identity.current.id,
        formVersion: sitePackage.formVersion,
        packageId: sitePackage.id,
        siteId: sitePackage.siteId,
        context,
        coordinates: coordinate,
        placement: coordinate ? { source: "hand", gpsAccuracyMetres: null } : null,
        answers: next.answers,
        questionIndex: next.index,
        startedAt: identity.current.startedAt,
        updatedAt: new Date().toISOString(),
      });
      if (!draft.success) return;
      void saveDraft(database, key, draft.data).catch(() => {
        setStatus("The draft could not be written to storage. Answers stay on screen.");
      });
    },
    [context, database, key, ready, sitePackage],
  );

  // A draft left behind by a force quit is offered back before anything else on launch.
  useEffect(() => {
    if (!ready) return;
    let active = true;
    void readDraft(database, key)
      .then((draft) => {
        if (!active || !draft) return;
        if (Object.keys(draft.answers).length === 0 && !draft.coordinates) return;
        setRecovered(draft);
      })
      .catch(() => {
        if (active) setStatus("Saved drafts could not be read on this device.");
      });
    return () => {
      active = false;
    };
  }, [database, key, ready]);

  const apply = useCallback((next: SessionState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const openPackage = useCallback(async (id: string) => {
    const opened = await bundledPackages.open(id);
    if (!opened) return undefined;
    setSitePackage(opened);
    setZone(opened.zones[0] ?? null);
    setRound(opened.rounds[0] ?? 1);
    return opened;
  }, []);

  const place = useCallback(
    (coordinate: Coordinate) => {
      identity.current ??= { id: randomUUID(), startedAt: new Date().toISOString() };
      setPlaced(coordinate);
      setArmed(false);
      setRecovered(null);
      const next = startSession(stateRef.current.answers);
      apply(next);
      persist(next, coordinate);
      setStatus(
        "Point placed by hand. This build records no device location, so no GPS accuracy is stored beside it.",
      );
    },
    [apply, persist],
  );

  const nudgeTo = useCallback(
    (coordinate: Coordinate) => {
      setPlaced(coordinate);
      persist(stateRef.current, coordinate);
    },
    [persist],
  );

  const dispatch = useCallback(
    (action: SessionAction): SessionStep => {
      if (!form) return { state: stateRef.current, destination: "stay", autoAdvance: false };
      const step = reduceSession(form, stateRef.current, action);
      apply(step.state);
      // Stepping back past the first question releases the point but not the observation: the
      // answers stay, and the draft keeps them without coordinates so a force quit still recovers.
      if (step.destination === "map") setPlaced(null);
      persist(step.state, step.destination === "map" ? null : placed);
      if (step.state.notice)
        setStatus(
          `${step.state.notice.count} ${
            step.state.notice.count === 1 ? "answer" : "answers"
          } dropped — the questions that held them are no longer asked.`,
        );
      return step;
    },
    [apply, form, persist, placed],
  );

  const reset = useCallback(
    (keep: Answers) => {
      identity.current = null;
      setPlaced(null);
      setArmed(false);
      apply(startSession(keep));
    },
    [apply],
  );

  const save = useCallback(async (): Promise<SaveOutcome> => {
    if (!form || !sitePackage || !context || !placed || !identity.current)
      return { ok: false, problems: [], message: "Place a point before saving." };
    const found = reviewProblems(form, stateRef.current.answers);
    if (found.length > 0) return { ok: false, problems: found };
    const placement: Placement = { source: "hand", gpsAccuracyMetres: null };
    const built = buildObservation({
      id: identity.current.id,
      form,
      answers: stateRef.current.answers,
      coordinates: placed,
      placement,
      context,
      siteId: sitePackage.siteId,
      createdAt: new Date().toISOString(),
    });
    if (!built.ok) return { ok: false, problems: [], message: built.message };
    try {
      await saveObservation(database, built.record, key);
      await clearDraft(database, key);
    } catch (cause) {
      return {
        ok: false,
        problems: [],
        message:
          cause instanceof Error
            ? `Could not save: ${cause.message}`
            : "Could not save. Your answers are still here; try again.",
      };
    }
    const heldOnly = key === "local" || !isUploadable(form.version);
    const carried: Record<string, Answers[string]> = {};
    if (form.version === "janet-test-v1")
      for (const id of carriedAnswers) {
        const value = stateRef.current.answers[id];
        if (value !== undefined) carried[id] = value;
      }
    setStatus(`${shortLabel(built.record.id)} written to device storage.`);
    reset(carried);
    wake();
    return { ok: true, heldOnly };
  }, [context, database, form, key, placed, reset, sitePackage, wake]);

  const discard = useCallback(() => {
    reset({});
    void clearDraft(database, key).catch(() => {});
    setStatus("Observation discarded. Nothing was written to the record list.");
  }, [database, key, reset]);

  const resumeRecovered = useCallback(async () => {
    const draft = recovered;
    if (!draft) return undefined;
    const opened = await bundledPackages.open(draft.packageId);
    if (!opened) {
      setStatus("That draft belongs to a package this device no longer has.");
      return undefined;
    }
    setSitePackage(opened);
    setZone(
      opened.zones.find((entry) => entry.id === draft.context.zoneId) ?? opened.zones[0] ?? null,
    );
    setRound(draft.context.round);
    setFreshPeriod(draft.context.freshPeriod);
    setPlaced(draft.coordinates);
    identity.current = { id: draft.id, startedAt: draft.startedAt };
    apply({ index: draft.questionIndex, answers: draft.answers, notice: null });
    setRecovered(null);
    setStatus("Draft restored — every answer was written to storage as you tapped it.");
    return opened;
  }, [apply, recovered]);

  const discardRecovered = useCallback(async () => {
    setRecovered(null);
    await clearDraft(database, key).catch(() => {});
    setStatus("Draft discarded.");
  }, [database, key]);

  return (
    <FieldSessionContext
      value={{
        sitePackage,
        form,
        zone,
        round,
        freshPeriod,
        placed,
        armed,
        state,
        status,
        recovered,
        context,
        openPackage,
        chooseZone: setZone,
        chooseRound: setRound,
        toggleFreshPeriod: () => setFreshPeriod((value) => !value),
        setArmed,
        place,
        nudgeTo,
        dispatch,
        save,
        discard,
        resumeRecovered,
        discardRecovered,
        announce: setStatus,
      }}
    >
      {children}
    </FieldSessionContext>
  );
}

export function useFieldSession() {
  return useContext(FieldSessionContext);
}
