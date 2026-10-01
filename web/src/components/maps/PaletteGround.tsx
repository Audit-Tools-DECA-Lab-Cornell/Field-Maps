"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";

/**
 * Leaflet applies its container style once, when the map mounts. The ground around a site has to
 * follow the palette too, so it is repainted whenever the palette changes rather than remounting
 * the map and losing the reader's pan and zoom.
 */
export function PaletteGround({ colour }: { readonly colour: string }) {
	const map = useMap();
	useEffect(() => {
		map.getContainer().style.background = colour;
	}, [map, colour]);
	return null;
}
