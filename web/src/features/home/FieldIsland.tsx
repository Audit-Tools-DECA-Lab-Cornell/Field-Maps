import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/contour/Icon";
import { Island } from "@/components/contour/Island";
import { StateBadge } from "@/components/contour/StateBadge";

import { FieldPlan } from "./FieldPlan";

/** A step that is an action, not a state: the action's glyph and its words, in ink. */
function Action({ icon, children }: { icon: IconName; children: ReactNode }) {
	return (
		<span className="inline-flex items-baseline gap-1.5 font-semibold text-ink">
			<Icon name={icon} size={16} className="mt-1 shrink-0 self-start" />
			<span className="min-w-0">{children}</span>
		</span>
	);
}

const STEPS: { id: string; label: ReactNode; detail: string }[] = [
	{
		id: "place",
		label: <Action icon="crosshair">Place a point</Action>,
		detail: "On the site map, where it happened."
	},
	{ id: "answer", label: <Action icon="list">Answer the form</Action>, detail: "One question at a time." },
	{
		id: "saved",
		label: <StateBadge kind="queue" state="onDevice" label="Saved on this device" />,
		detail: "The moment the observer taps Save. No signal needed."
	},
	{
		id: "uploaded",
		label: <StateBadge kind="queue" state="uploaded" />,
		detail: "Only after FieldMaps has the record."
	}
];

/**
 * The island beside the home page headline: the plan, then one observation's way from the field to the
 * team, in the queue's own words (DESIGN §6). The two states are the ones every record passes through.
 */
export function FieldIsland() {
	return (
		<Island title="From the field to the team">
			<div className="overflow-hidden rounded-thumb border border-line">
				<FieldPlan />
			</div>
			<ol role="list" className="mt-5">
				{STEPS.map(step => (
					<li
						key={step.id}
						className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-rule py-3 last:pb-0">
						{step.label}
						<span className="type-body text-ink-2">{step.detail}</span>
					</li>
				))}
			</ol>
		</Island>
	);
}
