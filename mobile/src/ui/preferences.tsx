import Storage from "expo-sqlite/kv-store";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance } from "react-native";
import { setMapBase } from "../maps/palette";
import type { Scheme } from "./tokens";

/**
 * The observer's preferences, kept on this device. They are read synchronously at start so the first
 * frame is already in the chosen theme. The map palette is separate from the screen theme (Rule 03):
 * an observer can read a Day plan on a Dusk screen.
 */
export type Preferences = {
  screen: Scheme;
  mapPalette: "day" | "night";
  hand: "left" | "right";
  haptics: boolean;
  largerText: boolean;
};

export const DEFAULT_PREFERENCES: Preferences = {
  screen: "day",
  mapPalette: "day",
  hand: "right",
  haptics: true,
  largerText: false,
};

const KEY_PREFIX = "fm.pref.";

function readPreference<K extends keyof Preferences>(key: K): Preferences[K] {
  const fallback = DEFAULT_PREFERENCES[key];
  try {
    const raw = Storage.getItemSync(KEY_PREFIX + key);
    if (raw === null) return fallback;
    const value: unknown = JSON.parse(raw);
    return typeof value === typeof fallback ? (value as Preferences[K]) : fallback;
  } catch {
    return fallback;
  }
}

function writePreference<K extends keyof Preferences>(key: K, value: Preferences[K]): void {
  try {
    Storage.setItemSync(KEY_PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage can fail on a full disk. The preference still applies until the app closes.
  }
}

function readAll(): Preferences {
  return {
    screen: readPreference("screen"),
    mapPalette: readPreference("mapPalette"),
    hand: readPreference("hand"),
    haptics: readPreference("haptics"),
    largerText: readPreference("largerText"),
  };
}

type PreferencesValue = Preferences & {
  set: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
};

const PreferencesContext = createContext<PreferencesValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(readAll);

  // Native alerts and pickers follow the screen theme; the field map follows the map palette.
  useEffect(() => {
    Appearance.setColorScheme(preferences.screen === "dusk" ? "dark" : "light");
  }, [preferences.screen]);
  useEffect(() => {
    setMapBase(preferences.mapPalette);
  }, [preferences.mapPalette]);

  const set = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    writePreference(key, value);
    setPreferences((current) => ({ ...current, [key]: value }));
  }, []);

  const value = useMemo(() => ({ ...preferences, set }), [preferences, set]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesValue {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("usePreferences needs a PreferencesProvider above it");
  return value;
}
