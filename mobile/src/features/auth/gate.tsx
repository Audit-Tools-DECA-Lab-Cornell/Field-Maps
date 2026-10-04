import Storage from "expo-sqlite/kv-store";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useAccount } from "../../auth/provider";
import { PREVIEW_ALLOWED } from "../preview/data-source";
import { useProfile } from "./profile-store";

/**
 * Which part of the collector opens: sign-in, onboarding or the app. The root layout guards its route
 * groups with this (Stack.Protected), so a screen never has to check by itself.
 *
 * The rule:
 * - A practice build (no FieldMaps server configured) has no accounts and goes straight in.
 * - Otherwise a live session or an account cached on this device counts as signed in, so an observer whose
 *   token expired in the field keeps collecting offline. Only a deliberate sign-out clears the cache.
 * - A signed-in account without a finished observer profile goes through onboarding first.
 *
 * Review builds can force one of the three with a dev override (the (dev)/states screen).
 */

export const GATE_OVERRIDES = ["real", "signed-out", "onboarding", "signed-in"] as const;
export type GateOverride = (typeof GATE_OVERRIDES)[number];

export type GateRoute = "auth" | "onboarding" | "app";

export type GateInput = {
  /** A FieldMaps server is configured, so the build has accounts (`useAccount().configured`). */
  configured: boolean;
  /** A live session. */
  session: boolean;
  /** An account remembered on this device, even with an expired token. */
  cachedAccount: boolean;
  /** The account's observer profile is saved and onboarding finished. */
  profileComplete: boolean;
  override?: GateOverride | undefined;
  /** Overrides apply only in development and review builds. */
  overrideAllowed?: boolean | undefined;
};

export type GateDecision = {
  signedIn: boolean;
  needsOnboarding: boolean;
  route: GateRoute;
  /** The dev override decided, not the account. */
  overridden: boolean;
};

const FORCED: Record<Exclude<GateOverride, "real">, Omit<GateDecision, "overridden">> = {
  "signed-out": { signedIn: false, needsOnboarding: false, route: "auth" },
  onboarding: { signedIn: true, needsOnboarding: true, route: "onboarding" },
  "signed-in": { signedIn: true, needsOnboarding: false, route: "app" },
};

/** The gate as a pure function of what the device knows. */
export function decideGate(input: GateInput): GateDecision {
  const override = input.override ?? "real";
  if (input.overrideAllowed === true && override !== "real")
    return { ...FORCED[override], overridden: true };
  const signedIn = !input.configured || input.session || input.cachedAccount;
  const needsOnboarding = signedIn && input.configured && !input.profileComplete;
  const route: GateRoute = !signedIn ? "auth" : needsOnboarding ? "onboarding" : "app";
  return { signedIn, needsOnboarding, route, overridden: false };
}

const OVERRIDE_KEY = "fm.dev.gate";
const overrideListeners = new Set<() => void>();
let overrideCache: GateOverride | undefined;

function isOverride(value: unknown): value is GateOverride {
  return typeof value === "string" && (GATE_OVERRIDES as readonly string[]).includes(value);
}

function readOverride(): GateOverride {
  if (!PREVIEW_ALLOWED) return "real";
  if (overrideCache === undefined) {
    try {
      const stored = Storage.getItemSync(OVERRIDE_KEY);
      overrideCache = isOverride(stored) ? stored : "real";
    } catch {
      overrideCache = "real";
    }
  }
  return overrideCache;
}

function writeOverride(next: GateOverride): void {
  if (!PREVIEW_ALLOWED) return;
  overrideCache = next;
  try {
    Storage.setItemSync(OVERRIDE_KEY, next);
  } catch {
    // The override still applies until the app closes.
  }
  for (const listener of overrideListeners) listener();
}

function subscribeOverride(listener: () => void): () => void {
  overrideListeners.add(listener);
  return () => {
    overrideListeners.delete(listener);
  };
}

export type Gate = GateDecision & {
  /** A FieldMaps server is configured. False in practice builds, which have no sign-in. */
  configured: boolean;
  /** What the account and profile alone decide, whatever the override says. */
  real: GateDecision;
  devOverride: GateOverride;
  setDevOverride: (next: GateOverride) => void;
  /** Development and review builds only. */
  overrideAllowed: boolean;
};

export function useGate(): Gate {
  const { configured, session, account } = useAccount();
  const profile = useProfile();
  const devOverride = useSyncExternalStore(subscribeOverride, readOverride, readOverride);
  const setDevOverride = useCallback((next: GateOverride) => writeOverride(next), []);

  return useMemo(() => {
    const input: GateInput = {
      configured,
      session: session !== null,
      cachedAccount: account !== null,
      profileComplete: profile.complete,
    };
    const real = decideGate(input);
    const shown = decideGate({ ...input, override: devOverride, overrideAllowed: PREVIEW_ALLOWED });
    return {
      ...shown,
      configured,
      real,
      devOverride,
      setDevOverride,
      overrideAllowed: PREVIEW_ALLOWED,
    };
  }, [configured, session, account, profile.complete, devOverride, setDevOverride]);
}
