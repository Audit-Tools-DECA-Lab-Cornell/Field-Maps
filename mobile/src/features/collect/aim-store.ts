import { useSyncExternalStore } from "react";
import type { Coordinate } from "../../domain/observation";

/**
 * Where the cross is, kept outside React state. The map reports its centre many times a second while
 * it moves; writing that into state would re-render the whole map on every frame. Only the small
 * readouts that show the coordinate subscribe here, and they are throttled to a readable rate.
 */
export type Aim = {
  readonly centre: Coordinate;
  readonly zoom: number;
  /** True while the map is moving under the cross. */
  readonly moving: boolean;
};

export type AimStore = {
  get: () => Aim;
  set: (next: Aim) => void;
  subscribe: (listener: () => void) => () => void;
};

/** How often a moving map may refresh the readouts: about ten times a second. */
export const AIM_THROTTLE_MS = 100;

export function createAimStore(initial: Aim, now: () => number = Date.now): AimStore {
  let current = initial;
  let lastEmit = 0;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set: (next) => {
      current = next;
      // A settled map always reports; a moving one at most every AIM_THROTTLE_MS.
      const time = now();
      if (next.moving && time - lastEmit < AIM_THROTTLE_MS) return;
      lastEmit = time;
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function useAim(store: AimStore): Aim {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
