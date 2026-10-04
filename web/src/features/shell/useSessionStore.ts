"use client";

import { useSyncExternalStore } from "react";

import type { SessionStore } from "@/lib/preview";

/**
 * Reads a session store made with createSessionStore (lib/preview.ts). The server and the first client
 * render see the initial value; the stored value follows straight after hydration.
 */
export function useSessionStore<T>(store: SessionStore<T>): T {
	return useSyncExternalStore(store.subscribe, store.get, store.getServer);
}
