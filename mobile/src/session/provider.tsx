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
import { shortLabel } from "../domain/labels";
import type { Coordinate, Placement, RoundContext } from "../domain/observation";
import type { RoundType } from "../domain/rounds";
import type { Answers, FormDefinition } from "../forms/definition";
import { type ReviewProblem, reviewProblems } from "../forms/engine";
import { carriedQuestionIds, isUploadable } from "../forms/registry";
import {
  reduceSession,
  type SessionAction,
  type SessionState,
  type SessionStep,
  startSession,
} from "../forms/session";
import { zoneAnchor } from "../maps/geometry";
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
import { commitObservation } from "../storage/observation-store";
import { useSync } from "../sync/provider";
import {
  type ObservationIdentity,
  ownershipProblem,
  packageSwitchProblem,
  recoveryProblem,
} from "./ownership";
import { formForRound, offersRound } from "./round-forms";

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

export type OpenOutcome =
  | { readonly ok: true; readonly sitePackage: SitePackage }
  | { readonly ok: false; readonly reason: string };

/** A record saved in this session, for the "last saved" card and the zones an inventory has covered. */
export type SessionSave = {
  readonly id: string;
  readonly zoneId: string;
  readonly zoneLabel: string;
  readonly roundType: RoundType;
  readonly savedAt: string;
  readonly heldOnly: boolean;
};

/** Why the round or zone cannot change now, or null. */
export type ChangeBlock = string | null;

type FieldSessionValue = {
  readonly sitePackage: SitePackage | null;
  readonly form: FormDefinition | null;
  readonly zone: SiteZone | null;
  readonly roundType: RoundType;
  readonly freshPeriod: boolean;
  readonly placed: Coordinate | null;
  /** `hand` for a placed play event, `zone` for a whole-zone inventory stored at the zone's centre. */
  readonly placementSource: Placement["source"];
  readonly armed: boolean;
  readonly state: SessionState;
  readonly status: string;
  readonly recovered: ObservationDraft | null;
  readonly context: RoundContext | null;
  /** The observation currently open, if any — an unfinished one blocks opening another study. */
  readonly inProgress: ObservationIdentity | null;
  /** Records saved since the package was opened, newest first. */
  readonly saves: readonly SessionSave[];
  /** Why the round type cannot change right now (an observation is open), or null. */
  readonly roundBlock: ChangeBlock;
  /** Why the zone cannot change right now (a zone inventory is open), or null. */
  readonly zoneBlock: ChangeBlock;
  openPackage: (id: string) => Promise<OpenOutcome>;
  chooseZone: (zone: SiteZone) => void;
  chooseRoundType: (roundType: RoundType) => void;
  toggleFreshPeriod: () => void;
  setArmed: (armed: boolean) => void;
  place: (coordinate: Coordinate) => void;
  /** Opens the current zone's inventory: a whole-zone record, stored at the zone's centre. */
  startZoneRecord: () => void;
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
  roundType: "standard",
  freshPeriod: false,
  placed: null,
  placementSource: "hand",
  armed: false,
  state: startSession(),
  status: "",
  recovered: null,
  context: null,
  inProgress: null,
  saves: [],
  roundBlock: null,
  zoneBlock: null,
  openPackage: async () => ({ ok: false, reason: "No workspace is open." }),
  chooseZone: () => {},
  chooseRoundType: () => {},
  toggleFreshPeriod: () => {},
  setArmed: () => {},
  place: () => {},
  startZoneRecord: () => {},
  nudgeTo: () => {},
  dispatch: () => ({ state: startSession(), destination: "stay", autoAdvance: false }),
  save: async () => ({ ok: false, problems: [] }),
  discard: () => {},
  resumeRecovered: async () => undefined,
  discardRecovered: async () => {},
  announce: () => {},
};

const FieldSessionContext = createContext(missing);

export { shortLabel } from "../domain/labels";

/** The form a round collects on a package: the play-event form, or the zone inventory. */
const OPEN_OBSERVATION_BLOCK =
  "An observation is open. Save or discard it first, so its answers keep the round they were collected in.";
const OPEN_INVENTORY_BLOCK =
  "This zone's inventory is open. Save or discard it before choosing another zone.";

export function FieldSessionProvider({ children }: PropsWithChildren) {
  const database = useSQLiteContext();
  const { key, ready } = useAccount();
  const { wake } = useSync();

  const [sitePackage, setSitePackage] = useState<SitePackage | null>(null);
  const [zone, setZone] = useState<SiteZone | null>(null);
  const [roundType, setRoundType] = useState<RoundType>("standard");
  const [freshPeriod, setFreshPeriod] = useState(false);
  const [placed, setPlaced] = useState<Coordinate | null>(null);
  const [placementSource, setPlacementState] = useState<Placement["source"]>("hand");
  // Read by callbacks in the same handler that changes it (beginning an inventory writes its first
  // draft at once), so the value lives in a ref as well as in state.
  const placementRef = useRef<Placement["source"]>("hand");
  const setPlacementSource = useCallback((source: Placement["source"]) => {
    placementRef.current = source;
    setPlacementState(source);
  }, []);
  const [saves, setSaves] = useState<readonly SessionSave[]>([]);
  const [armed, setArmed] = useState(false);
  const [state, setState] = useState<SessionState>(startSession());
  const [status, setStatus] = useState("Offline-first collector ready.");
  const [recovered, setRecovered] = useState<ObservationDraft | null>(null);

  const [inProgress, setInProgress] = useState<ObservationIdentity | null>(null);

  const stateRef = useRef(state);
  const identity = useRef<ObservationIdentity | null>(null);
  const openedPackage = useRef<string | null>(null);
  const form = sitePackage ? formForRound(sitePackage, roundType) : null;

  const holdIdentity = useCallback((next: ObservationIdentity | null) => {
    identity.current = next;
    setInProgress(next);
  }, []);

  const context: RoundContext | null =
    sitePackage && zone
      ? {
          packageId: sitePackage.id,
          packageVersion: sitePackage.version,
          zoneId: zone.id,
          zoneLabel: zone.label,
          roundType,
          freshPeriod,
          inheritedFrom: freshPeriod ? "" : sitePackage.inheritedContext,
        }
      : null;

  const persist = useCallback(
    (next: SessionState, coordinate: Coordinate | null) => {
      const owner = identity.current;
      if (!ready || !sitePackage || !context || !owner) return;
      // The account or study changed underneath an open observation: its draft belongs to
      // whoever started it, so nothing is written into the new account's slot.
      if (ownershipProblem(owner, key, sitePackage.id) !== null) return;
      const draft = observationDraftSchema.safeParse({
        id: owner.id,
        owner: owner.owner,
        formVersion: form?.version ?? sitePackage.formVersion,
        packageId: sitePackage.id,
        siteId: sitePackage.siteId,
        context,
        coordinates: coordinate,
        placement: coordinate ? { source: placementRef.current, gpsAccuracyMetres: null } : null,
        answers: next.answers,
        questionIndex: next.index,
        startedAt: owner.startedAt,
        updatedAt: new Date().toISOString(),
      });
      if (!draft.success) return;
      void saveDraft(database, key, draft.data).catch(() => {
        setStatus("The draft could not be written to storage. Answers stay on screen.");
      });
    },
    [context, database, form, key, ready, sitePackage],
  );

  // A draft left behind by a force quit is offered back before anything else on launch.
  useEffect(() => {
    if (!ready) return;
    let active = true;
    // Drop the standing offer first. The account can change without this provider unmounting,
    // and an offer left from the previous account would hand its answers to whoever is signed
    // in now — including when the new account has no draft of its own to replace it.
    setRecovered(null);
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

  // Signing out or signing in as someone else must not carry an open observation across the
  // boundary: the in-memory session is closed, and its draft stays under the account that
  // started it, ready to be recovered when that account signs back in.
  const lastKey = useRef(key);
  useEffect(() => {
    if (lastKey.current === key) return;
    lastKey.current = key;
    // What this session saved belongs to the account that saved it: the next observer starts with
    // no zone marked as inventoried, even when nothing was open at the switch.
    setSaves([]);
    openedPackage.current = null;
    if (identity.current === null) return;
    const previous = identity.current;
    holdIdentity(null);
    setPlaced(null);
    setArmed(false);
    stateRef.current = startSession();
    setState(stateRef.current);
    setStatus(
      `Your account changed. The unfinished observation in ${previous.packageName} was closed; its draft is kept for the account that started it.`,
    );
  }, [holdIdentity, key]);

  const apply = useCallback((next: SessionState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const openPackage = useCallback(async (id: string): Promise<OpenOutcome> => {
    const open = identity.current;
    // Switching study under an open observation would stamp its answers with another package's
    // form and context, and overwrite its draft. Finish or discard it first; nothing is lost.
    const blocked = packageSwitchProblem(open, id);
    if (blocked !== null) return { ok: false, reason: blocked };
    const opened = await bundledPackages.open(id);
    if (!opened) return { ok: false, reason: "That package could not be opened." };
    // Saves belong to the package they were made in; opening another clears the session's list.
    if (openedPackage.current !== opened.id) setSaves([]);
    openedPackage.current = opened.id;
    setSitePackage(opened);
    if (!open) {
      setZone(
        (current) =>
          opened.zones.find((entry) => entry.id === current?.id) ?? opened.zones[0] ?? null,
      );
      // A round this site cannot record falls back to Standard rather than staying chosen.
      setRoundType((current) => (offersRound(opened, current) ? current : "standard"));
    }
    return { ok: true, sitePackage: opened };
  }, []);

  const begin = useCallback(
    (coordinate: Coordinate, source: Placement["source"]) => {
      if (!sitePackage) return;
      const fresh = identity.current === null;
      identity.current ??= {
        id: randomUUID(),
        startedAt: new Date().toISOString(),
        owner: key,
        packageId: sitePackage.id,
        packageName: sitePackage.name,
      };
      holdIdentity(identity.current);
      setPlaced(coordinate);
      setPlacementSource(source);
      setArmed(false);
      setRecovered(null);
      // Adjusting a point keeps the question the observer was on; a new observation starts at the top.
      const next = fresh
        ? startSession(stateRef.current.answers)
        : { ...stateRef.current, notice: null };
      apply(next);
      persist(next, coordinate);
      setStatus(
        source === "zone"
          ? "Zone inventory open. It is stored at the zone's centre; no point is placed."
          : "Point placed by hand. This build records no device location, so no GPS accuracy is stored beside it.",
      );
    },
    [apply, holdIdentity, key, persist, setPlacementSource, sitePackage],
  );

  const place = useCallback((coordinate: Coordinate) => begin(coordinate, "hand"), [begin]);

  const startZoneRecord = useCallback(() => {
    if (!zone) return;
    if (identity.current !== null && placed !== null) return;
    begin(zoneAnchor(zone), "zone");
  }, [begin, placed, zone]);

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
      // A zone inventory has no point to release: stepping back past its first question keeps it open.
      const release = step.destination === "map" && placementRef.current === "hand";
      if (release) setPlaced(null);
      persist(step.state, release ? null : placed);
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
      holdIdentity(null);
      setPlaced(null);
      setPlacementSource("hand");
      setArmed(false);
      apply(startSession(keep));
    },
    [apply, holdIdentity, setPlacementSource],
  );

  const save = useCallback(async (): Promise<SaveOutcome> => {
    const owner = identity.current;
    if (!form || !sitePackage || !context || !placed || !owner)
      return { ok: false, problems: [], message: "Place a point before saving." };
    const mismatch = ownershipProblem(owner, key, sitePackage.id);
    if (mismatch !== null) return { ok: false, problems: [], message: mismatch };
    const found = reviewProblems(form, stateRef.current.answers);
    if (found.length > 0) return { ok: false, problems: found };
    const placement: Placement = { source: placementRef.current, gpsAccuracyMetres: null };
    const built = buildObservation({
      id: owner.id,
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
      // One transaction: a record can never be stored while its draft survives to be offered
      // back under an identifier the observations table already holds.
      await commitObservation(database, built.record, key);
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
    for (const id of carriedQuestionIds(form)) {
      const value = stateRef.current.answers[id];
      if (value !== undefined) carried[id] = value;
    }
    setSaves((current) => [
      {
        id: built.record.id,
        zoneId: context.zoneId,
        zoneLabel: context.zoneLabel,
        roundType: context.roundType,
        savedAt: built.record.createdAt,
        heldOnly,
      },
      ...current,
    ]);
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
    const wrongAccount = recoveryProblem(draft.owner, key);
    if (wrongAccount !== null) {
      setRecovered(null);
      setStatus(wrongAccount);
      return undefined;
    }
    const opened = await bundledPackages.open(draft.packageId);
    if (!opened) {
      setStatus("That draft belongs to a package this device no longer has.");
      return undefined;
    }
    setSitePackage(opened);
    setZone(
      opened.zones.find((entry) => entry.id === draft.context.zoneId) ?? opened.zones[0] ?? null,
    );
    setRoundType(draft.context.roundType);
    setFreshPeriod(draft.context.freshPeriod);
    setPlaced(draft.coordinates);
    setPlacementSource(draft.placement?.source ?? "hand");
    holdIdentity({
      id: draft.id,
      startedAt: draft.startedAt,
      owner: key,
      packageId: opened.id,
      packageName: opened.name,
    });
    apply({ index: draft.questionIndex, answers: draft.answers, notice: null });
    setRecovered(null);
    setStatus("Draft restored — every answer was written to storage as you tapped it.");
    return opened;
  }, [apply, holdIdentity, key, recovered, setPlacementSource]);

  const discardRecovered = useCallback(async () => {
    setRecovered(null);
    await clearDraft(database, key).catch(() => {});
    setStatus("Draft discarded.");
  }, [database, key]);

  const open = inProgress !== null;
  const roundBlock: ChangeBlock = open ? OPEN_OBSERVATION_BLOCK : null;
  const zoneBlock: ChangeBlock = open && placementSource === "zone" ? OPEN_INVENTORY_BLOCK : null;

  const chooseZone = useCallback(
    (next: SiteZone) => {
      if (identity.current !== null && placementSource === "zone") return;
      setZone(next);
    },
    [placementSource],
  );

  const chooseRoundType = useCallback((next: RoundType) => {
    if (identity.current !== null) return;
    setRoundType(next);
    // Leaving a play-event round for the inventory (or back) starts the next record from the top.
    setArmed(false);
  }, []);

  return (
    <FieldSessionContext
      value={{
        sitePackage,
        form,
        zone,
        roundType,
        freshPeriod,
        placed,
        placementSource,
        armed,
        state,
        status,
        recovered,
        context,
        inProgress,
        saves,
        roundBlock,
        zoneBlock,
        openPackage,
        chooseZone,
        chooseRoundType,
        toggleFreshPeriod: () => setFreshPeriod((value) => !value),
        setArmed,
        place,
        startZoneRecord,
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
