import type { CoverageMatrix } from "@/lib/analysis";
import { formatCount } from "@/lib/format";

/**
 * “Is each zone being observed enough times to compare rounds?”
 *
 * Magnitude, so the fill is one hue running dim to bright — never a second hue and never a
 * rainbow. It is a real table, which is also its own accessible reading: the number is in every
 * cell, so the tint is a second way of seeing a value that is already written down. A cell under
 * the protocol target is marked with a glyph as well as a colour.
 */
export function CoverageTable({ matrix, target }: { readonly matrix: CoverageMatrix; readonly target: number }) {
	return (
		<figure className="m-0 max-w-[34rem]">
			<table className="w-full border-collapse text-detail">
				<caption className="pb-snug text-left text-meta text-neutral-400">
					Events per zone per round. The protocol target is {formatCount(target)} an round; a cell below it is
					marked ⚠.
				</caption>
				<thead>
					<tr>
						<th
							scope="col"
							className="w-full py-tight pr-base text-left text-micro font-normal text-neutral-500">
							Zone
						</th>
						{matrix.rounds.map(round => (
							<th
								key={round}
								scope="col"
								className="w-[4.5rem] px-tight py-tight text-right text-micro font-normal whitespace-nowrap text-neutral-500">
								Round {round}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{matrix.rows.map(row => (
						<tr key={row.zoneId}>
							<th
								scope="row"
								className="border-t border-rule-faint py-tight pr-base text-left text-detail font-normal text-neutral-300">
								{row.label}
							</th>
							{row.cells.map(cell => {
								// One hue, dim to bright. 0 stays at the ground so an empty cell reads as empty.
								const share = matrix.max === 0 ? 0 : cell.count / matrix.max;
								const mix = cell.count === 0 ? 0 : 8 + Math.round(share * 30);
								return (
									<td
										key={cell.round}
										title={`${row.label}, round ${cell.round}: ${formatCount(cell.count)} of ${formatCount(target)}`}
										className="border-t border-rule-faint px-tight py-tight text-right align-middle">
										<span
											className={`tnum inline-flex min-w-11 items-center justify-end gap-hair rounded-sm px-tight py-hair ${
												cell.thin ? "text-attention-text" : "text-accent-100"
											}`}
											style={{
												backgroundColor: `color-mix(in srgb, var(--color-accent) ${mix}%, transparent)`
											}}>
											{cell.thin && <span aria-hidden>⚠</span>}
											{formatCount(cell.count)}
										</span>
									</td>
								);
							})}
						</tr>
					))}
				</tbody>
			</table>
		</figure>
	);
}
