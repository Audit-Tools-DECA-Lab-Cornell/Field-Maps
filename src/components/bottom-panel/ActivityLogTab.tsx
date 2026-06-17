"use client";

import type { IconName } from "@/components/shared/Icon";
import { Icon } from "@/components/shared/Icon";
import { formatDateTime } from "@/lib/dateFormat";
import { useOperationsStore } from "@/state/useOperationsStore";
import type { ActivitySeverity } from "@/types/domain";

const severityIcon: Record<ActivitySeverity, IconName> = {
	info: "info",
	success: "check-circle",
	warning: "warning",
	error: "error"
};

const severityColor: Record<ActivitySeverity, string> = {
	info: "var(--text-3)",
	success: "var(--green)",
	warning: "var(--amber)",
	error: "var(--red)"
};

export function ActivityLogTab() {
	const activityLog = useOperationsStore(s => s.activityLog);

	// Copy before sorting — never mutate the store array.
	const sorted = [...activityLog].sort((a, b) =>
		a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0
	);

	if (sorted.length === 0) {
		return (
			<div className="fo-empty" style={{ padding: "14px 16px" }}>
				No activity recorded yet.
			</div>
		);
	}

	return (
		<div style={{ display: "flex", flexDirection: "column" }}>
			{sorted.map((item, idx) => (
				<div
					key={item.id}
					style={{
						display: "flex",
						alignItems: "flex-start",
						gap: 10,
						padding: "7px 14px",
						borderTop: idx === 0 ? "none" : "1px solid var(--border)"
					}}>
					<span
						style={{
							color: severityColor[item.severity],
							display: "inline-flex",
							paddingTop: 1
						}}>
						<Icon name={severityIcon[item.severity]} size={14} />
					</span>
					<span
						className="fo-mono"
						style={{
							color: "var(--text-3)",
							fontSize: 11,
							width: 142,
							flex: "none",
							paddingTop: 1
						}}>
						{formatDateTime(item.timestamp)}
					</span>
					<span style={{ minWidth: 0, fontSize: 12.5, lineHeight: 1.5 }}>
						<span style={{ fontWeight: 650, color: "var(--text)" }}>{item.actor}</span>
						<span style={{ color: "var(--text-3)" }}> — </span>
						<span style={{ color: "var(--text-2)" }}>{item.message}</span>
					</span>
				</div>
			))}
		</div>
	);
}
