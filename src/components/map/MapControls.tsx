"use client";

import { Icon } from "@/components/shared/Icon";
import { useOperationsStore } from "@/state/useOperationsStore";

export function MapControls() {
	const fitRegion = useOperationsStore(s => s.fitRegion);
	const fitSelected = useOperationsStore(s => s.fitSelected);
	const selectedParcelId = useOperationsStore(s => s.selection.selectedParcelId);

	const btn: React.CSSProperties = {
		display: "flex",
		alignItems: "center",
		gap: 6,
		padding: "6px 10px",
		background: "var(--surface)",
		border: "1px solid var(--border-strong)",
		borderRadius: "var(--r-md)",
		boxShadow: "var(--shadow-sm)",
		fontSize: 11.5,
		fontWeight: 600,
		color: "var(--text)",
		cursor: "pointer"
	};

	return (
		<div
			style={{
				position: "absolute",
				top: 12,
				right: 12,
				zIndex: 1000,
				display: "flex",
				flexDirection: "column",
				gap: 6
			}}>
			<button type="button" style={btn} onClick={fitRegion} title="Fit to region">
				<Icon name="target" size={14} />
				Fit region
			</button>
			<button
				type="button"
				style={{ ...btn, opacity: selectedParcelId ? 1 : 0.5 }}
				onClick={fitSelected}
				disabled={!selectedParcelId}
				title="Fit to selected parcel">
				<Icon name="pin" size={14} />
				Fit selected
			</button>
		</div>
	);
}
