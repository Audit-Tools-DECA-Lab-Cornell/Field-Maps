"use client";

import type { IconName } from "@/components/shared/Icon";
import { Icon } from "@/components/shared/Icon";
import { Section } from "@/components/shared/Panel";
import { useOperationsStore } from "@/state/useOperationsStore";
import type { LayerVisibility } from "@/types/ui";

const LAYER_ROWS: { key: keyof LayerVisibility; label: string; icon: IconName }[] = [
	{ key: "parcels", label: "Parcels", icon: "layers" },
	{ key: "irrigationAssets", label: "Irrigation assets", icon: "droplet" },
	{ key: "soilSensors", label: "Soil sensors", icon: "sensor" },
	{ key: "accessGates", label: "Access gates", icon: "gate" },
	{ key: "maintenanceFlags", label: "Maintenance flags", icon: "warning" },
	{
		key: "inspectionHeatOverlay",
		label: "Inspection heat overlay",
		icon: "target"
	}
];

export function LayerTogglePanel() {
	const visibleLayers = useOperationsStore(s => s.filters.visibleLayers);
	const toggleLayer = useOperationsStore(s => s.toggleLayer);

	return (
		<Section title="Map layers">
			<div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
				{LAYER_ROWS.map(row => (
					<label key={row.key} className="fo-check" style={{ justifyContent: "flex-start" }}>
						<span style={{ color: "var(--text-3)", display: "inline-flex" }}>
							<Icon name={row.icon} size={15} />
						</span>
						<span style={{ flex: 1, color: "var(--text)" }}>{row.label}</span>
						<input type="checkbox" checked={visibleLayers[row.key]} onChange={() => toggleLayer(row.key)} />
					</label>
				))}
			</div>
		</Section>
	);
}
