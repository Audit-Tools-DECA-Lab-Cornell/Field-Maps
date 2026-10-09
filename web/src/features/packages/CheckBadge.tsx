import { StateBadge } from "@/components/contour/StateBadge";

/** A check's state as the state vocabulary words it: passes, fails, or a warning drawn with the fails glyph. */
export function CheckBadge({ state }: { state: "passed" | "warning" | "blocked" | "skipped" }) {
	if (state === "passed") return <StateBadge kind="check" state="passes" size="sm" />;
	if (state === "warning") return <StateBadge kind="check" state="fails" label="Warning" size="sm" />;
	if (state === "skipped") return <StateBadge kind="check" state="checking" label="Skipped" size="sm" />;
	return <StateBadge kind="check" state="fails" size="sm" />;
}
