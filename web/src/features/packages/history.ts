import type { PackageSummary, PreparationCheck } from "@/lib/api/types";
import { formatBytes } from "@/lib/labels";
import type { Clock } from "@/lib/time";

/**
 * A site's map packages as the history shows them. A site's current package is the newest one that is
 * ready (there is no activate step); older ready packages are archived; a blocked package stays in the
 * history with the reason it failed and cannot be downloaded.
 */

export type HistoryState = "current" | "archived" | "blocked";

export type HistoryRow = {
	packageId: string;
	version: number;
	state: HistoryState;
	/** "Oct 07, 2026 · 14:05" in the project's timezone. */
	prepared: string;
	bytes: number;
	sizeLabel: string;
	formVersion: string;
	/** For a blocked package: the first check that blocked it, when it has been read. */
	blockedDetail: string | null;
};

/** The first check that blocked a package, in the order the checks ran. */
export function firstBlockedDetail(checks: readonly PreparationCheck[]): string | null {
	return checks.find(check => check.state === "blocked")?.detail ?? null;
}

/** The newest ready package: the one observers download. */
export function currentPackage<T extends { state: string; version: number }>(packages: readonly T[]): T | null {
	return packages.filter(item => item.state === "ready").sort((a, b) => b.version - a.version)[0] ?? null;
}

/** The blocked packages whose checks the history reads to say why, newest first, at most `limit`. */
export function blockedToExplain(packages: readonly PackageSummary[], limit = 8): string[] {
	return packages
		.filter(item => item.state === "blocked")
		.sort((a, b) => b.version - a.version)
		.slice(0, limit)
		.map(item => item.package_id);
}

export function historyRows(
	packages: readonly PackageSummary[],
	clock: Clock,
	blockedDetails: Readonly<Record<string, string | null | undefined>> = {}
): HistoryRow[] {
	const current = currentPackage(packages);
	return [...packages]
		.sort((a, b) => b.version - a.version)
		.map(item => ({
			packageId: item.package_id,
			version: item.version,
			state:
				item.state === "blocked" ? "blocked" : item.package_id === current?.package_id ? "current" : "archived",
			prepared: clock.dayTime(item.prepared_at),
			bytes: item.archive_bytes,
			sizeLabel: formatBytes(item.archive_bytes),
			formVersion: item.form_version,
			blockedDetail: item.state === "blocked" ? (blockedDetails[item.package_id] ?? null) : null
		}));
}
