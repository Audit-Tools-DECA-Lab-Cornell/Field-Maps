"use client";

import { FilterPanel } from "./FilterPanel";
import { LayerTogglePanel } from "./LayerTogglePanel";
import { OperationalSummary } from "./OperationalSummary";
import { ParcelList } from "./ParcelList";
import { SavedViews } from "./SavedViews";

export function LeftSidebar() {
	return (
		<div
			style={{
				height: "100%",
				width: "100%",
				display: "flex",
				flexDirection: "column",
				minHeight: 0,
				background: "var(--surface)",
				borderRight: "1px solid var(--border)"
			}}>
			<OperationalSummary />
			<div className="fo-scroll" style={{ flex: 1, minHeight: 0 }}>
				<FilterPanel />
				<LayerTogglePanel />
				<ParcelList />
				<SavedViews />
			</div>
		</div>
	);
}
