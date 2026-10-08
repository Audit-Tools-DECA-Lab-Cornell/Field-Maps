"use client";

import { useId, useState } from "react";

import { Field, Select } from "@/components/contour";
import { MapFrame, type MapFrameProps } from "@/components/map/MapFrame";

/**
 * A MapFrame that keeps its own selection, so the gallery can exercise markers without a table. The
 * picker stands in for the table on the Data screen: choosing a record the plan has scrolled away from
 * eases that marker back into view.
 */
export function SelectableMap({
	selectedId: initial = null,
	picker = false,
	...props
}: Omit<MapFrameProps, "onSelectObservation"> & { picker?: boolean }) {
	const [selectedId, setSelectedId] = useState<string | null>(initial);
	const pickerId = useId();
	const observations = props.observations ?? [];
	return (
		<div className="flex flex-col gap-4">
			<MapFrame {...props} selectedId={selectedId} onSelectObservation={setSelectedId} />
			{picker && observations.length > 0 && (
				<Field
					htmlFor={pickerId}
					label="Selected record"
					hint="Zoom in, then pick a record off screen: the plan eases it into view."
					className="max-w-sm">
					<Select value={selectedId ?? ""} onChange={event => setSelectedId(event.target.value || null)}>
						<option value="">None</option>
						{observations.map(observation => (
							<option key={observation.id} value={observation.id}>
								{observation.id}
							</option>
						))}
					</Select>
				</Field>
			)}
		</div>
	);
}
