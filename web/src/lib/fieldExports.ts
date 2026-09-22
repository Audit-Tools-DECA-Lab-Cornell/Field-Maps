import type { ObservationPoint } from "@/types/capture";

const csvValue = (value: string | number | boolean): string => {
	const text = String(value);
	return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export function observationsToGeoJson(observations: ObservationPoint[]) {
	return {
		type: "FeatureCollection" as const,
		name: "fieldops_observations",
		crs: {
			type: "name",
			properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" }
		},
		features: observations
	};
}

export function observationsToCsv(observations: ObservationPoint[]): string {
	const header = [
		"observation_id",
		"longitude",
		"latitude",
		"observer_initials",
		"observed_at",
		"feature_type",
		"condition",
		"age_or_size",
		"notes",
		"follow_up_required",
		"sync_status"
	];
	const rows = observations.map(observation => {
		const [longitude, latitude] = observation.geometry.coordinates;
		const properties = observation.properties;
		return [
			observation.id,
			longitude.toFixed(7),
			latitude.toFixed(7),
			properties.observerInitials,
			properties.observedAt,
			properties.kind,
			properties.condition,
			properties.ageOrSize,
			properties.notes,
			properties.followUpRequired,
			properties.syncStatus
		]
			.map(csvValue)
			.join(",");
	});
	return [header.join(","), ...rows].join("\n");
}

export function observationsToArcGisAdds(observations: ObservationPoint[]) {
	return observations.map(observation => {
		const [x, y] = observation.geometry.coordinates;
		return {
			geometry: {
				x,
				y,
				spatialReference: { wkid: 4326 }
			},
			attributes: {
				observation_id: observation.id,
				observer_initials: observation.properties.observerInitials,
				observed_at: observation.properties.observedAt,
				feature_type: observation.properties.kind,
				condition: observation.properties.condition,
				age_or_size: observation.properties.ageOrSize,
				notes: observation.properties.notes,
				follow_up_required: observation.properties.followUpRequired ? 1 : 0
			}
		};
	});
}

export function arcGisRequestPreview(observations: ObservationPoint[]) {
	return {
		method: "POST",
		endpoint: "https://<your-org>/arcgis/rest/services/<service>/FeatureServer/0/applyEdits",
		contentType: "application/x-www-form-urlencoded",
		body: {
			f: "json",
			adds: observationsToArcGisAdds(observations),
			rollbackOnFailure: true
		}
	};
}

export function downloadText(filename: string, text: string, type: string): void {
	const blob = new Blob([text], { type });
	const href = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = href;
	anchor.download = filename;
	anchor.click();
	URL.revokeObjectURL(href);
}
