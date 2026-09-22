"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { seedObservations } from "@/data/observations";
import type { ObservationDraft, ObservationPoint } from "@/types/capture";

interface CaptureState {
	workspaceOpen: boolean;
	isPlacing: boolean;
	draftCoordinates: [number, number] | null;
	observations: ObservationPoint[];
	hasHydrated: boolean;
	openWorkspace: () => void;
	closeWorkspace: () => void;
	startPlacing: () => void;
	setDraftCoordinates: (coordinates: [number, number], method?: "map_tap" | "sample") => void;
	cancelDraft: () => void;
	saveObservation: (draft: ObservationDraft) => ObservationPoint | null;
	markAllSynced: () => void;
	resetDemo: () => void;
	setHasHydrated: (ready: boolean) => void;
}

export const useCaptureStore = create<CaptureState>()(
	persist(
		(set, get) => ({
			workspaceOpen: false,
			isPlacing: false,
			draftCoordinates: null,
			observations: seedObservations,
			hasHydrated: false,
			openWorkspace: () => set({ workspaceOpen: true }),
			closeWorkspace: () => set({ workspaceOpen: false, isPlacing: false, draftCoordinates: null }),
			startPlacing: () => set({ isPlacing: true, draftCoordinates: null }),
			setDraftCoordinates: coordinates => set({ draftCoordinates: coordinates, isPlacing: false }),
			cancelDraft: () => set({ draftCoordinates: null, isPlacing: false }),
			saveObservation: draft => {
				const coordinates = get().draftCoordinates;
				if (!coordinates || !draft.observerInitials.trim()) return null;
				const nextNumber =
					Math.max(1002, ...get().observations.map(item => Number(item.id.replace("OBS-", "")) || 1000)) + 1;
				const observation: ObservationPoint = {
					id: `OBS-${nextNumber}`,
					type: "Feature",
					geometry: { type: "Point", coordinates },
					properties: {
						...draft,
						observerInitials: draft.observerInitials.trim().toUpperCase(),
						syncStatus: "queued"
					}
				};
				set(state => ({
					observations: [...state.observations, observation],
					draftCoordinates: null,
					isPlacing: false
				}));
				return observation;
			},
			markAllSynced: () =>
				set(state => ({
					observations: state.observations.map(item => ({
						...item,
						properties: { ...item.properties, syncStatus: "synced" }
					}))
				})),
			resetDemo: () => set({ observations: seedObservations, draftCoordinates: null, isPlacing: false }),
			setHasHydrated: ready => set({ hasHydrated: ready })
		}),
		{
			name: "fieldmaps-capture-v1",
			storage: createJSONStorage(() => localStorage),
			partialize: state => ({ observations: state.observations }),
			onRehydrateStorage: () => state => state?.setHasHydrated(true)
		}
	)
);
