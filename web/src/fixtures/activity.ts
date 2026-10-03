import type { ActivityItem, BlockingItem } from "./types";

/** Recent field activity on Play Study, newest first (project-01). */
export const ACTIVITY: ActivityItem[] = [
	{ tone: "attention", title: "Upload rejected", detail: "OBS-0248 · PS · observer code missing", time: "11:33" },
	{
		tone: "uploaded",
		title: "Observation received",
		detail: "OBS-0244 · JL · Woodland edge · form demo-v1",
		time: "11:29"
	},
	{ tone: "ink", title: "Map package activated", detail: "Riverside · map v3 · 84 MB", time: "Yesterday" },
	{ tone: "ink", title: "Form draft opened", detail: "demo-v2 draft · nothing has been published", time: "Yesterday" }
];

/** What stands between Play Study and a complete field return, in the order a manager can act on it. */
export function blockingItems(orgSlug: string, projectSlug: string): BlockingItem[] {
	const base = `/o/${orgSlug}/p/${projectSlug}`;
	return [
		{
			tone: "attention",
			icon: "triangle-alert",
			title: "Missing observer code",
			detail: "Needs attention · OBS-0248 · the observer corrects it on their device, then sends it again",
			meta: "On a device"
		},
		{
			tone: "waiting",
			icon: "pencil",
			title: "Janet's form is still a draft",
			detail: "Draft · 8 protocol notes open, two option lists missing",
			action: { label: "Open form", href: `${base}/forms/versions/janet-test-v1` }
		},
		{
			tone: "waiting",
			icon: "clock",
			title: "One device has not reported readiness",
			detail: "Unknown · AK last reported yesterday. A past download is not a live offline guarantee.",
			action: { label: "Open site", href: `${base}/sites/riverside` }
		}
	];
}
