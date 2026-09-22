import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "FieldOps Offline Collector",
		short_name: "FieldOps",
		description: "Offline-first field observation capture with QGIS and ArcGIS handoff.",
		start_url: "/",
		display: "standalone",
		background_color: "#0a1418",
		theme_color: "#0f1f25",
		orientation: "any",
		icons: [
			{
				src: "/fieldops-mark.svg",
				sizes: "any",
				type: "image/svg+xml",
				purpose: "any"
			}
		]
	};
}
