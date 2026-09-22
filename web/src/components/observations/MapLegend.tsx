import { Glass } from "@/components/nocturne/chrome";
import { RECORD_STATES } from "@/lib/states";

/** Two keys, because a marker carries two facts. Both are named in words, not colour alone. */
export function MapLegend() {
	return (
		<Glass className="px-snug py-tight">
			<div className="flex flex-wrap items-center gap-x-base gap-y-hair text-micro text-neutral-400">
				<span className="text-neutral-500">Shape</span>
				<span className="flex items-center gap-hair">
					<span aria-hidden className="size-[7px] rounded-[1px] bg-neutral-300" /> Physical
				</span>
				<span className="flex items-center gap-hair">
					<span aria-hidden className="size-[7px] rounded-full bg-neutral-300" /> Exploratory
				</span>
				<span className="flex items-center gap-hair">
					<span
						aria-hidden
						className="size-0 border-r-[4px] border-b-[7px] border-l-[4px] border-r-transparent border-b-neutral-300 border-l-transparent"
					/>{" "}
					Imaginative
				</span>
				<span className="flex items-center gap-hair">
					<span aria-hidden className="size-[7px] rotate-45 rounded-[1px] bg-neutral-300" /> All others
				</span>

				<span aria-hidden className="h-3 w-px bg-edge" />

				<span className="text-neutral-500">Fill</span>
				{(["in-database", "revised", "flagged", "withdrawn"] as const).map(state => (
					<span key={state} className="flex items-center gap-hair">
						<span
							aria-hidden
							className={`size-[7px] rounded-full ${
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
