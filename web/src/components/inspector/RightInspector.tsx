"use client";

import { selectSelectedAsset, selectSelectedParcel, useOperationsStore } from "@/state/useOperationsStore";

import { AssetInspector } from "./AssetInspector";
import { EmptyInspector } from "./EmptyInspector";
import { GeometryEditPanel } from "./GeometryEditPanel";
import { InspectionForm } from "./InspectionForm";
import { MaintenanceForm } from "./MaintenanceForm";
import { ParcelEditForm } from "./ParcelEditForm";
import { ParcelInspector } from "./ParcelInspector";

export function RightInspector() {
	const inspectorMode = useOperationsStore(s => s.selection.inspectorMode);
	const hasParcel = useOperationsStore(s => selectSelectedParcel(s) != null);
	const hasAsset = useOperationsStore(s => selectSelectedAsset(s) != null);

	let content: React.ReactNode;
	switch (inspectorMode) {
		case "parcel_view":
			content = hasParcel ? <ParcelInspector /> : <EmptyInspector />;
			break;
		case "asset_view":
			content = hasAsset ? <AssetInspector /> : <EmptyInspector />;
			break;
		case "parcel_edit":
			content = hasParcel ? <ParcelEditForm /> : <EmptyInspector />;
			break;
		case "inspection_create":
			content = hasParcel ? <InspectionForm /> : <EmptyInspector />;
			break;
		case "geometry_edit":
			content = hasParcel ? <GeometryEditPanel /> : <EmptyInspector />;
			break;
		case "maintenance_create":
			content = hasParcel ? <MaintenanceForm /> : <EmptyInspector />;
			break;
		case "sync_review":
			content = hasParcel ? <ParcelInspector /> : <EmptyInspector />;
			break;
		case "empty":
		default:
			content = <EmptyInspector />;
			break;
	}

	return (
		<div
			className="fo-scroll"
			style={{
				height: "100%",
				width: "100%",
				background: "var(--surface)",
				borderLeft: "1px solid var(--border)"
			}}>
			{content}
		</div>
	);
}
