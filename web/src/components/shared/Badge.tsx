import { assetStatusLabel, parcelStatusLabel, priorityLabel, riskLabel, syncStatusLabel } from "@/lib/labels";
import type { AssetStatus, ParcelStatus, Priority, RiskLevel, SyncStatus } from "@/types/domain";

export type Tone = "green" | "amber" | "orange" | "red" | "gray" | "purple" | "blue";

const toneClass: Record<Tone, string> = {
	green: "is-green",
	amber: "is-amber",
	orange: "is-orange",
	red: "is-red",
	gray: "is-gray",
	purple: "is-purple",
	blue: "is-blue"
};

export function Badge({
	tone = "gray",
	children,
	square = false,
	dot = false,
	className = ""
}: {
	tone?: Tone;
	children: React.ReactNode;
	square?: boolean;
	dot?: boolean;
	className?: string;
}) {
	return (
		<span className={`fo-badge ${toneClass[tone]} ${square ? "fo-badge--square" : ""} ${className}`}>
			{dot && <span className="fo-dot" style={{ background: "currentColor" }} />}
			{children}
		</span>
	);
}

export const parcelStatusTone: Record<ParcelStatus, Tone> = {
	healthy: "green",
	inspection_due: "amber",
	maintenance_required: "orange",
	blocked: "red",
	inactive: "gray"
};

export const syncStatusTone: Record<SyncStatus, Tone> = {
	synced: "green",
	pending: "amber",
	syncing: "blue",
	failed: "red",
	local_draft: "purple"
};

export const riskTone: Record<RiskLevel, Tone> = {
	low: "green",
	medium: "amber",
	high: "orange",
	critical: "red"
};

export const assetStatusTone: Record<AssetStatus, Tone> = {
	operational: "green",
	needs_attention: "amber",
	offline: "gray",
	blocked: "red",
	resolved: "blue"
};

export const priorityTone: Record<Priority, Tone> = {
	low: "gray",
	medium: "amber",
	high: "orange",
	critical: "red"
};

export const StatusBadge = ({ status }: { status: ParcelStatus }) => (
	<Badge tone={parcelStatusTone[status]} dot>
		{parcelStatusLabel[status]}
	</Badge>
);

export const SyncBadge = ({ status }: { status: SyncStatus }) => (
	<Badge tone={syncStatusTone[status]} square dot={status === "syncing"}>
		{syncStatusLabel[status]}
	</Badge>
);

export const RiskBadge = ({ level }: { level: RiskLevel }) => (
	<Badge tone={riskTone[level]}>{riskLabel[level]} risk</Badge>
);

export const AssetStatusBadge = ({ status }: { status: AssetStatus }) => (
	<Badge tone={assetStatusTone[status]} dot>
		{assetStatusLabel[status]}
	</Badge>
);

export const PriorityBadge = ({ priority }: { priority: Priority }) => (
	<Badge tone={priorityTone[priority]} square>
		{priorityLabel[priority]}
	</Badge>
);
