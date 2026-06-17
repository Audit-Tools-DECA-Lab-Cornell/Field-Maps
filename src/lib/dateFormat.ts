// Deterministic date handling. "Today" is hard-coded so the prototype's
// overdue/relative calculations always match the sample data.

export const TODAY = "2026-06-16";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Parse "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss" as a local Date (TZ-safe). */
function parseLocal(iso: string): Date {
	const [datePart, timePart] = iso.split("T");
	const [y, m, d] = datePart.split("-").map(Number);
	if (timePart) {
		const [hh, mm, ss] = timePart.split(":").map(Number);
		return new Date(y, m - 1, d, hh || 0, mm || 0, ss || 0);
	}
	return new Date(y, m - 1, d);
}

const startOfDay = (iso: string): number => {
	const dt = parseLocal(iso);
	return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
};

/** "Jun 2, 2026" */
export function formatDate(iso: string | undefined | null): string {
	if (!iso) return "—";
	const dt = parseLocal(iso);
	return `${MONTHS[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}

/** "Jun 2, 2026, 3:18 PM" */
export function formatDateTime(iso: string | undefined | null): string {
	if (!iso) return "—";
	const dt = parseLocal(iso);
	let h = dt.getHours();
	const ampm = h >= 12 ? "PM" : "AM";
	h = h % 12 || 12;
	const min = String(dt.getMinutes()).padStart(2, "0");
	return `${MONTHS[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}, ${h}:${min} ${ampm}`;
}

/** "3:18 PM" */
export function formatTime(iso: string | undefined | null): string {
	if (!iso) return "—";
	const dt = parseLocal(iso);
	let h = dt.getHours();
	const ampm = h >= 12 ? "PM" : "AM";
	h = h % 12 || 12;
	const min = String(dt.getMinutes()).padStart(2, "0");
	return `${h}:${min} ${ampm}`;
}

const MS_PER_DAY = 86_400_000;

/** Whole days from TODAY to `iso` (negative = in the past / overdue). */
export function daysUntil(iso: string): number {
	return Math.round((startOfDay(iso) - startOfDay(TODAY)) / MS_PER_DAY);
}

/** Positive number of days `iso` is past due relative to TODAY, else 0. */
export function daysOverdue(iso: string): number {
	const d = daysUntil(iso);
	return d < 0 ? -d : 0;
}

/** Human relative phrase vs TODAY, e.g. "4 days ago", "in 3 days", "today". */
export function relativeToToday(iso: string): string {
	const d = daysUntil(iso);
	if (d === 0) return "today";
	if (d === 1) return "tomorrow";
	if (d === -1) return "yesterday";
	if (d < 0) return `${-d} days ago`;
	return `in ${d} days`;
}

/** Relative phrase for a past timestamp vs TODAY ("2 days ago", "today"). */
export function timeAgo(iso: string): string {
	const d = daysUntil(iso);
	if (d === 0) return "today";
	if (d === -1) return "yesterday";
	if (d < 0) return `${-d} days ago`;
	return relativeToToday(iso);
}

/** Today's date as an ISO timestamp at a given clock-ish offset. */
export function nowStamp(): string {
	return `${TODAY}T09:00:00`;
}

/** Add `n` days to a "YYYY-MM-DD" date, returning the same format. */
export function addDays(dateStr: string, n: number): string {
	const base = parseLocal(dateStr);
	const next = new Date(base.getFullYear(), base.getMonth(), base.getDate() + n);
	const y = next.getFullYear();
	const m = String(next.getMonth() + 1).padStart(2, "0");
	const d = String(next.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

/** Build a deterministic in-session timestamp: TODAY at 09:00 + `seq` minutes. */
export function stampFromSeq(seq: number): string {
	const totalMinutes = 9 * 60 + seq;
	const hh = String(Math.floor(totalMinutes / 60) % 24).padStart(2, "0");
	const mm = String(totalMinutes % 60).padStart(2, "0");
	return `${TODAY}T${hh}:${mm}:00`;
}
