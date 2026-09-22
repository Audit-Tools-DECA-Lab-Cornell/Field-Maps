import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "FieldMaps",
		short_name: "FieldMaps",
		description: "Manage FieldMaps projects, places, instruments and collected observations.",
		start_url: "/",
		display: "standalone",
		// Nocturne's ground and surface, the same two values the collector opens on.
		background_color: "#161826",
		theme_color: "#161826",
		orientation: "any",
		// The FieldMaps app icon; sources and rebuild steps are in mobile/assets/icon-source/.
		icons: [
			{ src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
			{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
			{ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
			{ src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
		]
	};
}
