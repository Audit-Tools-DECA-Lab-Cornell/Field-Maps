import { Glass } from "@/components/nocturne/chrome";
import { RECORD_STATES } from "@/lib/states";

import { MARKER } from "./markers";

/**
 * The key is drawn at text scale rather than map scale — a swatch sits in a line of 11.5 px type,
 * not on a basemap — but it is derived from the mark it describes rather than guessed, so the two
 * cannot drift apart.
 */
const SWATCH = MARKER.shape - 2;

/** Two keys, because a marker carries two facts. Both are named in words, not colour alone. */
export function MapLegend() {
	return (
		<Glass className="px-snug py-tight">
			<div className="flex flex-wrap items-center gap-x-base gap-y-hair text-micro text-neutral-400">
				<span className="text-neutral-500">Shape</span>
				<span className="flex items-center gap-hair">
					<span
						aria-hidden
						className="rounded-[1px] bg-neutral-300"
						style={{ width: SWATCH, height: SWATCH }}
					/>{" "}
					Physical
				</span>
				<span className="flex items-center gap-hair">
					<span
						aria-hidden
						className="rounded-full bg-neutral-300"
						style={{ width: SWATCH, height: SWATCH }}
					/>{" "}
					Exploratory
				</span>
				<span className="flex items-center gap-hair">
					<span
						aria-hidden
						className="size-0 border-r-transparent border-b-neutral-300 border-l-transparent"
						style={{
							borderRightWidth: SWATCH / 2,
							borderBottomWidth: SWATCH,
							borderLeftWidth: SWATCH / 2
						}}
					/>{" "}
					Imaginative
				</span>
				<span className="flex items-center gap-hair">
					<span
						aria-hidden
						className="rotate-45 rounded-[1px] bg-neutral-300"
						style={{ width: SWATCH, height: SWATCH }}
					/>{" "}
					All others
				</span>

				<span aria-hidden className="h-3 w-px bg-edge" />

				<span className="text-neutral-500">Fill</span>
				{(["in-database", "revised", "flagged", "withdrawn"] as const).map(state => (
					<span key={state} className="flex items-center gap-hair">
						<span
							aria-hidden
							style={{ width: SWATCH, height: SWATCH }}
							className={`rounded-full ${
								state === "in-database"
									? "bg-accent-400"
									: state === "revised"
										? "bg-live"
										: state === "flagged"
											? "bg-attention"
											: "bg-neutral-600"
							}`}
						/>
						{RECORD_STATES[state].label}
					</span>
				))}
			</div>
		</Glass>
	);
}
