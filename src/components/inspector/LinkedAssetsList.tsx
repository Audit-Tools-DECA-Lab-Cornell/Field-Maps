"use client";

import { useShallow } from "zustand/react/shallow";

import { AssetStatusBadge } from "@/components/shared/Badge";
import { Icon, type IconName } from "@/components/shared/Icon";
import { Section } from "@/components/shared/Panel";
import { timeAgo } from "@/lib/dateFormat";
import { assetTypeLabel } from "@/lib/labels";
import { selectAssetsForParcel, useOperationsStore } from "@/state/useOperationsStore";
import type { AssetType } from "@/types/domain";

const assetIcon: Record<AssetType, IconName> = {
	pump_station: "droplet",
	irrigation_valve: "droplet",
	soil_sensor: "sensor",
	access_gate: "gate",
	maintenance_flag: "warning"
};

export function LinkedAssetsList({ parcelId }: { parcelId: string }) {
	const assets = useOperationsStore(useShallow(s => selectAssetsForParcel(s, parcelId)));
	const selectAsset = useOperationsStore(s => s.selectAsset);

	return (
		<Section title={`Linked assets (${assets.length})`}>
			{assets.length === 0 ? (
				<div className="fo-empty">No field assets linked to this parcel.</div>
			) : (
				<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
					{assets.map(a => (
						<button
							key={a.id}
							type="button"
							className="fo-row"
							onClick={() => selectAsset(a.id)}
							style={{
								flexDirection: "row",
								alignItems: "center",
								gap: 9,
								textAlign: "left",
								width: "100%"
							}}>
							<Icon
								name={assetIcon[a.properties.assetType]}
								size={16}
								style={{ color: "var(--accent)" }}
							/>
							<div style={{ minWidth: 0, flex: 1 }}>
								<div
									style={{
										fontSize: 12.5,
										fontWeight: 600,
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap"
									}}>
									{a.properties.name}
								</div>
								<div style={{ fontSize: 11, color: "var(--text-3)" }}>
									{assetTypeLabel[a.properties.assetType]} · {timeAgo(a.properties.lastCheckedAt)}
								</div>
							</div>
							<AssetStatusBadge status={a.properties.status} />
						</button>
					))}
				</div>
			)}
		</Section>
	);
}
