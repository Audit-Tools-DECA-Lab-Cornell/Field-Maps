import { requireOptionalNativeModule } from "expo";
import Storage from "expo-sqlite/kv-store";
import { useEffect, useSyncExternalStore } from "react";
import { AppState, Linking } from "react-native";
import type { Fix } from "./my-location";

/**
 * "Show my location" on the field map. Off until the observer turns it on, and only then is location
 * permission asked for. While it is on and a map is showing, the device's position is watched and drawn;
 * it is never stored with an observation, uploaded, or kept after the map closes. The choice itself is
 * remembered on this device, so the dot is back the next time the map opens.
 */

export type LocationStatus =
  /** Not turned on. */
  | "off"
  /** Turned on; waiting for permission or the first fix. */
  | "searching"
  /** Turned on and showing a fix. */
  | "on"
  /** The observer declined location for DECA Mark; only Settings can change that now. */
  | "denied"
  /** Location services are off for the whole device. */
  | "services-off"
  /** This build of the app has no location module; it needs to be rebuilt. */
  | "unavailable";

type State = { readonly status: LocationStatus; readonly fix: Fix | null };

const CHOICE_KEY = "fm.map.myLocation";

function storedChoice(): boolean {
  try {
    return Storage.getItemSync(CHOICE_KEY) === "on";
  } catch {
    return false;
  }
}

let state: State = { status: storedChoice() ? "searching" : "off", fix: null };
const listeners = new Set<() => void>();

/** Read fresh after every await: the observer may have turned it off meanwhile. */
function isOff(): boolean {
  return state.status === "off";
}

function set(next: State) {
  state = next;
  for (const listener of listeners) listener();
}

function remember(on: boolean) {
  try {
    Storage.setItemSync(CHOICE_KEY, on ? "on" : "off");
  } catch {
    // The choice still applies until the app closes.
  }
}

async function locationModule() {
  if (!requireOptionalNativeModule("ExpoLocation")) return null;
  return import("expo-location");
}

/** Asks for permission if it has not been answered, and says whether the map may watch. */
async function permitted(ask: boolean): Promise<LocationStatus | null> {
  const location = await locationModule();
  if (!location) return "unavailable";
  if (!(await location.hasServicesEnabledAsync())) return "services-off";
  const current = await location.getForegroundPermissionsAsync();
  if (current.granted) return null;
  if (!current.canAskAgain) return "denied";
  // Opening a map never asks: only turning the dot on does. Until then it reads as off.
  if (!ask) return "off";
  const answer = await location.requestForegroundPermissionsAsync();
  return answer.granted ? null : "denied";
}

let watching: { remove: () => void } | null = null;
let starting: Promise<void> | null = null;
let watchers = 0;

function startWatching(ask: boolean): Promise<void> {
  starting ??= begin(ask).finally(() => {
    starting = null;
  });
  return starting;
}

async function begin(ask: boolean) {
  if (watching || isOff()) return;
  const blocked = await permitted(ask);
  if (blocked) {
    if (blocked === "off") remember(false);
    set({ status: blocked, fix: null });
    return;
  }
  const location = await locationModule();
  if (!location || watchers === 0 || isOff()) return;
  watching = await location.watchPositionAsync(
    { accuracy: location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0.5 },
    (position) => {
      if (isOff()) return;
      set({
        status: "on",
        fix: {
          coordinate: [position.coords.longitude, position.coords.latitude],
          accuracy: position.coords.accuracy ?? null,
        },
      });
    },
  );
  // Turned off, or the map closed, while the watch was starting.
  if (isOff() || watchers === 0) stopWatching();
}

function stopWatching() {
  watching?.remove();
  watching = null;
}

export function turnLocationOn(): void {
  remember(true);
  set({ status: "searching", fix: null });
  if (watchers > 0) void startWatching(true).catch(() => set({ status: "unavailable", fix: null }));
}

export function turnLocationOff(): void {
  remember(false);
  stopWatching();
  set({ status: "off", fix: null });
}

/** For a denied permission: the system's settings page for DECA Mark is the only place to change it. */
export function openLocationSettings(): void {
  void Linking.openSettings();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The observer's position while a map shows it. Mounting the map starts the watch when location is on
 * (asking for nothing new: permission is only requested by turning it on), and so does coming back to
 * the app while it was blocked; unmounting stops it.
 */
export function useMyLocation(): State {
  useEffect(() => {
    watchers += 1;
    if (state.status !== "off")
      void startWatching(false).catch(() => set({ status: "unavailable", fix: null }));
    // Back from Settings: permission or location services may have been turned on there, so a blocked
    // dot looks again, still without asking.
    const subscription = AppState.addEventListener("change", (next) => {
      if (next !== "active" || (state.status !== "denied" && state.status !== "services-off"))
        return;
      set({ status: "searching", fix: null });
      void startWatching(false).catch(() => set({ status: "unavailable", fix: null }));
    });
    return () => {
      subscription.remove();
      watchers -= 1;
      if (watchers === 0) {
        stopWatching();
        // The last position is not kept once no map shows it.
        if (state.status === "on") set({ status: "searching", fix: null });
      }
    };
  }, []);
  return useSyncExternalStore(subscribe, () => state);
}
