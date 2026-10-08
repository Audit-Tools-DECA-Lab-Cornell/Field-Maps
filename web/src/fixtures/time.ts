/**
 * Every preview time is read against one fixed moment and formatted in the project's timezone, so the
 * server and the browser always print the same words and screenshots stay stable.
 */
export const PROJECT_TIME_ZONE = "America/New_York";

/** "snapshot Oct 02, 11:36". */
export const PREVIEW_NOW = new Date("2026-10-02T11:36:00-04:00");

const timeFormat = new Intl.DateTimeFormat("en-US", {
	timeZone: PROJECT_TIME_ZONE,
	hour: "2-digit",
	minute: "2-digit",
	hourCycle: "h23"
});

const dayFormat = new Intl.DateTimeFormat("en-US", {
	timeZone: PROJECT_TIME_ZONE,
	month: "short",
	day: "2-digit"
});

const dayKey = new Intl.DateTimeFormat("en-CA", {
	timeZone: PROJECT_TIME_ZONE,
	year: "numeric",
	month: "2-digit",
	day: "2-digit"
});

/** "11:28" */
export function formatTime(iso: string | Date): string {
	return timeFormat.format(typeof iso === "string" ? new Date(iso) : iso);
}

/** "Oct 02" */
export function formatDay(iso: string | Date): string {
	return dayFormat.format(typeof iso === "string" ? new Date(iso) : iso);
}

/** "Oct 02 · 11:28" */
export function formatDayTime(iso: string | Date): string {
	return `${formatDay(iso)} · ${formatTime(iso)}`;
}

/** "Today", "Yesterday", or "Sep 30", relative to the preview snapshot. */
export function relativeDay(iso: string | Date): string {
	const date = typeof iso === "string" ? new Date(iso) : iso;
	const key = dayKey.format(date);
	const today = dayKey.format(PREVIEW_NOW);
	const yesterday = dayKey.format(new Date(PREVIEW_NOW.getTime() - 86_400_000));
	if (key === today) return "Today";
	if (key === yesterday) return "Yesterday";
	return formatDay(date);
}

/** "Oct 02, 11:36" for the snapshot lines. */
export const SNAPSHOT_LABEL = `${formatDay(PREVIEW_NOW)}, ${formatTime(PREVIEW_NOW)}`;
