import { Island } from "@/components/contour/Island";
import { StateBadge } from "@/components/contour/StateBadge";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/contour/Table";
import { stateOf } from "@/lib/contour";

import { accessRows, type Identity } from "./view";

/**
 * Your access (org-05): every organization and project the account belongs to, its role as the role
 * vocabulary draws it (glyph and word), and what that role allows. The names are not links yet: the
 * workspace reads a real organization once WEB-06 connects it.
 */
export function AccessIsland({ identity }: { identity: Identity }) {
	const rows = accessRows(identity);
	return (
		<Island title="Your access" flush>
			{rows.length === 0 ? (
				<p className="px-island-pad py-6 type-body text-ink-2">
					This account does not belong to an organization or project yet.
				</p>
			) : (
				<Table caption="Your organizations and projects">
					<THead>
						<tr>
							<Th>Where</Th>
							<Th>Role</Th>
							<Th>What it allows</Th>
						</tr>
					</THead>
					<TBody>
						{rows.map(row => (
							<Tr key={row.key}>
								<Td>
									<span className="block font-semibold">{row.where}</span>
									{(row.detail || row.code) && (
										<span className="block type-small text-ink-2">
											{row.detail}
											{row.detail && row.code && " · "}
											{row.code && <span className="font-mono">{row.code}</span>}
										</span>
									)}
								</Td>
								<Td nowrap>
									<StateBadge kind="role" state={row.role} />
								</Td>
								<Td>{stateOf("role", row.role).allows}</Td>
							</Tr>
						))}
					</TBody>
				</Table>
			)}
		</Island>
	);
}
