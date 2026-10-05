"use client";

import Link from "next/link";
import { type Ref, useImperativeHandle, useRef } from "react";

import { Button } from "@/components/contour/Button";
import { Menu, MenuContent, MenuRadioGroup, MenuRadioItem, MenuTrigger } from "@/components/contour/Menu";
import { StateBadge } from "@/components/contour/StateBadge";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/contour/Table";
import { useRovingRows } from "@/components/contour/useRovingRows";
import { formatTime, type Observation, type ReviewState } from "@/fixtures";
import { cx } from "@/lib/cx";

import { type DataSort, plural, SORT_OPTIONS, zoneName } from "./filters";

/** Lets the page move focus to a row after a keyboard decision, and bring a row into view. */
export type ObservationTableHandle = {
	focusRow: (id: string) => void;
	revealRow: (id: string) => void;
	/** Whether keyboard focus is on a row of the table now. */
	hasRowFocus: () => boolean;
};

export type ObservationTableProps = {
	records: Observation[];
	reviewOf: (record: Observation) => ReviewState;
	selectedId: string | null;
	/** `pointer` for a click or tap, which opens the record's panel below 1280 px; `keyboard` for j / k and arrows. */
	onSelect: (id: string, via: "pointer" | "keyboard") => void;
	onOpen: (id: string) => void;
	hrefOf: (id: string) => string;
	sort: DataSort;
	onSortChange: (sort: DataSort) => void;
	handleRef?: Ref<ObservationTableHandle>;
};

/**
 * The observations in the current view (project-02): a roving-focus table from 768 px, and a list of row
 * cards on a phone. Both share the page's one selection.
 */
export function ObservationTable({
	records,
	reviewOf,
	selectedId,
	onSelect,
	onOpen,
	hrefOf,
	sort,
	onSortChange,
	handleRef
}: ObservationTableProps) {
	const wrapperRef = useRef<HTMLDivElement>(null);
	const selectedIndex = records.findIndex(record => record.id === selectedId);
	const { bodyProps, rowProps } = useRovingRows({
		count: records.length,
		selectedIndex,
		onSelect: index => {
			const record = records[index];
			if (record) onSelect(record.id, "keyboard");
		},
		onOpen: index => {
			const record = records[index];
			if (record) onOpen(record.id);
		}
	});

	useImperativeHandle(handleRef, () => {
		const rowOf = (id: string) => {
			const index = records.findIndex(record => record.id === id);
			// The table from 768 px, the cards below it: only one of them is laid out.
			const candidates = wrapperRef.current?.querySelectorAll<HTMLElement>(`[data-record-id="${id}"]`) ?? [];
			return index < 0 ? null : ([...candidates].find(node => node.offsetParent !== null) ?? null);
		};
		return {
			focusRow: id => rowOf(id)?.focus({ preventScroll: false }),
			revealRow: id => rowOf(id)?.scrollIntoView({ block: "nearest", behavior: "auto" }),
			hasRowFocus: () => Boolean(document.activeElement?.closest?.("[data-record-id]"))
		};
	}, [records]);

	const sortLabel = SORT_OPTIONS.find(option => option.value === sort)?.label ?? "Newest first";

	return (
		<div ref={wrapperRef} className="min-w-0">
			<div className="flex min-h-15 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-rule px-island-pad py-2">
				<h2 className="type-island text-ink">
					{records.length} {plural(records.length, "observation")}
				</h2>
				<Menu>
					<MenuTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							iconRight="chevron-down"
							aria-label={`Sort: ${sortLabel}`}
							className="-mr-3">
							{sortLabel}
						</Button>
					</MenuTrigger>
					<MenuContent align="end">
						<MenuRadioGroup value={sort} onValueChange={value => onSortChange(value as DataSort)}>
							{SORT_OPTIONS.map(option => (
								<MenuRadioItem key={option.value} value={option.value}>
									{option.label}
								</MenuRadioItem>
							))}
						</MenuRadioGroup>
					</MenuContent>
				</Menu>
			</div>

			<div className="hidden md:block">
				<Table caption="Observations in this view. Arrow keys or j and k move the selection; Enter opens it.">
					<THead>
						<tr>
							<Th>Observation</Th>
							<Th>Zone · round</Th>
							<Th>Play type</Th>
							<Th>Observer</Th>
							<Th>Review</Th>
						</tr>
					</THead>
					<TBody {...bodyProps}>
						{records.map((record, index) => {
							const props = rowProps(index);
							return (
								<Tr
									key={record.id}
									{...props}
									data-record-id={record.id}
									onSelect={() => onSelect(record.id, "pointer")}>
									<Td mono nowrap>
										<Link
											href={hrefOf(record.id)}
											tabIndex={-1}
											className="font-semibold text-ink underline decoration-1 underline-offset-4 hover:decoration-2">
											{record.id}
										</Link>
									</Td>
									<Td>
										<span className="block">{zoneName(record.zoneSlug)}</span>
										<span className="block type-small text-ink-2">
											Round {record.round} · {formatTime(record.capturedAt)}
										</span>
									</Td>
									<Td>{record.playTypeLabel}</Td>
									<Td mono>{record.observerInitials}</Td>
									<Td>
										<StateBadge
											kind="review"
											state={reviewOf(record)}
											size="sm"
											className="transition-[color] duration-(--ct-duration-quick) ease-standard"
										/>
									</Td>
								</Tr>
							);
						})}
					</TBody>
				</Table>
			</div>

			{/* Below 768 px each row is a card: the ID and review state on top, the rest as lines under it. */}
			<ul className="divide-y divide-rule md:hidden" aria-label="Observations in this view">
				{records.map(record => {
					const selected = record.id === selectedId;
					return (
						<li key={record.id}>
							<button
								type="button"
								data-record-id={record.id}
								aria-pressed={selected}
								onClick={() => onSelect(record.id, "pointer")}
								className={cx(
									"flex w-full flex-col gap-1 px-island-pad py-4 text-left text-ink",
									"[--ct-size-focus-gap:calc(var(--ct-size-focus-ring)*-2)]",
									"transition-[background-color] duration-(--ct-duration-quick) ease-standard",
									selected ? "bg-well selected-bar" : "hover:bg-ground"
								)}>
								<span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
									<span className="type-mono-data font-semibold underline decoration-1 underline-offset-4">
										{record.id}
									</span>
									<StateBadge kind="review" state={reviewOf(record)} size="sm" />
								</span>
								<span className="type-body">
									{zoneName(record.zoneSlug)} · Round {record.round} · {formatTime(record.capturedAt)}
								</span>
								<span className="type-small text-ink-2">
									{record.playTypeLabel} · Observer{" "}
									<span className="type-mono-data">{record.observerInitials}</span>
								</span>
							</button>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
