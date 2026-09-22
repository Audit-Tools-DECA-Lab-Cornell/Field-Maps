"use client";

import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { Section } from "@/components/shared/Panel";
import type { SavedViewId } from "@/state/useOperationsStore";
import { useOperationsStore } from "@/state/useOperationsStore";

const VIEWS: { id: SavedViewId; label: string }[] = [
	{ id: "todays_inspections", label: "Today's inspections" },
	{ id: "irrigation_maintenance", label: "Irrigation maintenance" },
	{ id: "unsynced_field_edits", label: "Unsynced field edits" },
	{ id: "high_risk", label: "High-risk parcels" }
];

export function SavedViews() {
	const applySavedView = useOperationsStore(s => s.applySavedView);

	return (
		<Section title="Saved views">
			<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
				{VIEWS.map(view => (
					<Button
						key={view.id}
						variant="subtle"
						block
						onClick={() => applySavedView(view.id)}
						style={{ justifyContent: "flex-start" }}>
						<Icon name="bookmark" size={14} />
						{view.label}
					</Button>
				))}
			</div>
		</Section>
	);
}
