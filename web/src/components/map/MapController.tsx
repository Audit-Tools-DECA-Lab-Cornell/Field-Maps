"use client";

import L from "leaflet";
import { useEffect } from "react";
import { useMap, useMapEvents } from "react-leaflet";

import { lngLatToLatLng, openRing, outerRing } from "@/lib/geometry";
import { useOperationsStore } from "@/state/useOperationsStore";

/** Bridges the store's imperative mapCommand to Leaflet, and clears selection
 *  when the empty map background is clicked (review mode only). */
export function MapController() {
	const map = useMap();
	const mapCommand = useOperationsStore(s => s.mapCommand);
	const consumeMapCommand = useOperationsStore(s => s.consumeMapCommand);
	const parcels = useOperationsStore(s => s.parcels);
	const clearSelection = useOperationsStore(s => s.clearSelection);
	const mapMode = useOperationsStore(s => s.selection.mapMode);

	useMapEvents({
		click: () => {
			if (mapMode !== "edit_geometry") clearSelection();
		}
	});

	useEffect(() => {
		if (!mapCommand) return;
		if (mapCommand.kind === "fit_region") {
			const pts = parcels.flatMap(p => openRing(outerRing(p.geometry.coordinates)).map(lngLatToLatLng));
			if (pts.length) {
				map.fitBounds(L.latLngBounds(pts as L.LatLngBoundsLiteral), {
					padding: [48, 48]
				});
			}
		} else if (mapCommand.kind === "fit_selected") {
			const parcel = parcels.find(p => p.id === mapCommand.parcelId);
			if (parcel) {
				const ring = openRing(outerRing(parcel.geometry.coordinates)).map(lngLatToLatLng);
				map.fitBounds(L.latLngBounds(ring as L.LatLngBoundsLiteral), {
					padding: [90, 90],
					maxZoom: 16
				});
			}
		}
		consumeMapCommand();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [mapCommand]);

	return null;
}
