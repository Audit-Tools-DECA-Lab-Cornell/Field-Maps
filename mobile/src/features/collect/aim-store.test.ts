import { describe, expect, it } from "vitest";
import { AIM_THROTTLE_MS, createAimStore } from "./aim-store";

describe("aim store", () => {
  const start = { centre: [-76.485, 42.448] as [number, number], zoom: 18, moving: false };

  it("keeps the latest centre even when it does not notify", () => {
    let clock = 1000;
    const store = createAimStore(start, () => clock);
    let calls = 0;
    store.subscribe(() => {
      calls += 1;
    });
    store.set({ ...start, moving: true });
    clock += 10;
    store.set({ centre: [-76.4851, 42.4481], zoom: 18, moving: true });
    expect(calls).toBe(1);
    expect(store.get().centre).toEqual([-76.4851, 42.4481]);
  });

  it("refreshes a moving map about ten times a second, and always when it settles", () => {
    let clock = 1000;
    const store = createAimStore(start, () => clock);
    let calls = 0;
    store.subscribe(() => {
      calls += 1;
    });
    for (let step = 0; step < 20; step += 1) {
      clock += 16;
      store.set({ ...start, moving: true });
    }
    const whileMoving = calls;
    expect(whileMoving).toBeLessThanOrEqual(Math.ceil((20 * 16) / AIM_THROTTLE_MS) + 1);
    clock += 1;
    store.set({ ...start, moving: false });
    expect(calls).toBe(whileMoving + 1);
  });

  it("stops notifying a listener that unsubscribed", () => {
    const store = createAimStore(start);
    let calls = 0;
    const stop = store.subscribe(() => {
      calls += 1;
    });
    stop();
    store.set({ ...start, moving: false });
    expect(calls).toBe(0);
  });
});
