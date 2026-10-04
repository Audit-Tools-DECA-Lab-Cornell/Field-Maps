"use client";

import { useState } from "react";

import {
	Island,
	Mono,
	StateBadge,
	Table,
	TBody,
	Td,
	TextLink,
	Th,
	THead,
	Tr,
	useRovingRows
} from "@/components/contour";

type Row = {
	id: string;
	zone: string;
	round: number;
	time: string;
	observer: string;
	queue: "uploaded" | "attention" | "onDevice";
	review: "notReviewed" | "approved" | "excluded";
};

/* Sample rows in the shape of the Data table (project-02). */
const ROWS: Row[] = [
	{
		id: "OBS-0244",
		zone: "Woodland edge",
		round: 3,
		time: "11:28",
		observer: "JL",
		queue: "uploaded",
		review: "notReviewed"
	},
	{
		id: "OBS-0243",
		zone: "Woodland edge",
		round: 3,
		time: "11:21",
		observer: "JL",
		queue: "uploaded",
		review: "notReviewed"
	},
	{
		id: "OBS-0242",
		zone: "North meadow",
		round: 1,
		time: "10:54",
		observer: "PS",
		queue: "uploaded",
		review: "approved"
	},
	{
		id: "OBS-0248",
		zone: "North meadow",
		round: 2,
		time: "11:33",
		observer: "PS",
		queue: "attention",
		review: "notReviewed"
	},
	{
		id: "OBS-0241",
		zone: "Woodland edge",
		round: 2,
		time: "10:12",
		observer: "AK",
		queue: "uploaded",
		review: "excluded"
	},
	{
		id: "OBS-0237",
		zone: "Sand area",
		round: 1,
		time: "09:47",
		observer: "AK",
		queue: "onDevice",
		review: "notReviewed"
	}
];

/**
 * An island table with roving selection: one tab stop, ↑ / ↓ or j / k to move, Home and End, Enter to open.
 * Opening a row here only says so; on Data it opens the record.
 */
export function TableDemo() {
	const [selected, setSelected] = useState(0);
	const [opened, setOpened] = useState<string | null>(null);
	const roving = useRovingRows({
		count: ROWS.length,
		selectedIndex: selected,
		onSelect: index => {
			setSelected(index);
			setOpened(null);
		},
		onOpen: index => setOpened(ROWS[index].id)
	});
	const current = ROWS[selected];

	return (
		<Island
			title="Observations"
			meta={`${ROWS.length} of ${ROWS.length} shown`}
			flush
			headingLevel={3}
			footnote={
				<span aria-live="polite">
					{opened
						? `Enter opened ${opened}. On Data this opens the record.`
						: `Selected ${current.id}. Press Enter to open it.`}
				</span>
			}>
			<Table caption="Observations, one row per record">
				<THead>
					<tr>
						<Th>Observation</Th>
						<Th>Zone · Round</Th>
						<Th>Observer</Th>
						<Th>Upload</Th>
						<Th>Review</Th>
						<Th numeric>Time</Th>
					</tr>
				</THead>
				<TBody {...roving.bodyProps}>
					{ROWS.map((row, index) => (
						<Tr key={row.id} {...roving.rowProps(index)}>
							<Td nowrap>
								{/* The row is the tab stop and Enter opens it; the link stays for pointers and screen-reader cursors. */}
								<TextLink href="#table" tone="ink" tabIndex={-1} className="type-mono-data">
									{row.id}
								</TextLink>
							</Td>
							<Td>
								{row.zone} · {row.round}
							</Td>
							<Td>
								<Mono>{row.observer}</Mono>
							</Td>
							<Td nowrap>
								<StateBadge kind="queue" state={row.queue} size="sm" />
							</Td>
							<Td nowrap>
								<StateBadge kind="review" state={row.review} size="sm" />
							</Td>
							<Td mono numeric>
								{row.time}
							</Td>
						</Tr>
					))}
				</TBody>
			</Table>
		</Island>
	);
}
