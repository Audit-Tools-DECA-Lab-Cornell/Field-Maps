"use client";

import type { ComponentPropsWithRef, ReactNode } from "react";

import { CoverageDots } from "@/components/contour/CoverageDots";
import { Icon, type IconName } from "@/components/contour/Icon";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/contour/Table";
import { MapFrame, type MapFrameProps } from "@/components/map/MapFrame";
import { SitePlan } from "@/components/map/SitePlan";
import { usePreview } from "@/features/shell/PreviewProvider";
import { cx } from "@/lib/cx";
import { MAP_PALETTES, useMapPalette } from "@/lib/map-palette";
import type { ProjectedSite } from "@/lib/plan";

/* Shared pieces of the Places screens (project-06 to project-10). */

export type LinkButtonProps = {
	icon?: IconName;
	children: ReactNode;
} & ComponentPropsWithRef<"button">;

/**
 * An in-place action that reads as an accent link ("Edit description"): a button, since it changes the
 * page rather than going anywhere.
 */
export function LinkButton({ icon, children, className, type = "button", ...rest }: LinkButtonProps) {
	return (
		<button
			{...rest}
			type={type}
			className={cx(
				"inline-flex items-baseline gap-1.5 rounded-sm text-left font-semibold text-accent underline-offset-4",
				"not-disabled:hover:underline disabled:cursor-not-allowed disabled:text-ink-2",
				className
			)}>
			{icon && <Icon name={icon} size={16} className="shrink-0 self-center" />}
			<span>{children}</span>
		</button>
	);
}

/** A mono eyebrow over a value: "MAP PACKAGE", "COVERAGE", "DESCRIPTION". */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
	return <p className={cx("type-mono-label text-ink-2", className)}>{children}</p>;
}

type MapAreaProps = MapFrameProps & {
	/** What the slot says when the map has nothing to show (the empty state). */
	emptyLine?: string;
};

/**
 * A site's map that honours the preview's screen state: a still placeholder while loading, a dashed slot
 * when there is nothing to draw or the page could not load, and the map itself otherwise. Offline keeps
 * the map, since it already loaded.
 */
export function MapArea({
	emptyLine = "The map appears here once the site has an active package.",
	...props
}: MapAreaProps) {
	const { screenState } = usePreview();
	const ratio = { aspectRatio: `${props.site.width} / ${props.site.height}` };
	const rounded = props.surface === "panel" ? "rounded-panel" : "rounded-island";

	if (screenState === "loading")
		return (
			<div
				aria-hidden="true"
				style={ratio}
				className={cx(
					"animate-fade-in bg-well [animation-delay:var(--ct-duration-skeleton-delay)]",
					rounded,
					props.className
				)}
			/>
		);

	if (screenState === "empty" || screenState === "error" || screenState === "no-access") {
		const line =
			screenState === "empty"
				? emptyLine
				: screenState === "error"
					? "The map could not load. Nothing was removed."
					: "The map is not open to your current role.";
		return (
			<div
				style={ratio}
				className={cx(
					"flex flex-col items-center justify-center gap-3 border border-dashed border-edge px-6 text-center",
					rounded,
					props.className
				)}>
				<Icon name={screenState === "no-access" ? "lock" : "layers"} size={24} className="text-ink-2" />
				<p className="max-w-sm type-small text-ink-2">{line}</p>
			</div>
		);
	}

	return <MapFrame {...props} />;
}

/**
 * The legend under a coverage map (project-07): the dots in the map palette's zone colour, since they
 * describe the map, with the illustrative target beside them.
 */
export function CoverageLegend({ target, className }: { target: string; className?: string }) {
	const [palette] = useMapPalette();
	const colour = MAP_PALETTES[palette].zone.edge;
	return (
		<ul className={cx("flex flex-wrap items-center gap-x-6 gap-y-2 type-small text-ink-2", className)}>
			<li className="flex items-center gap-2">
				<span style={{ color: colour }} className="inline-flex">
					<CoverageDots values={[true]} tone="map" size="sm" label="" />
				</span>
				Round met the target
			</li>
			<li className="flex items-center gap-2">
				<span style={{ color: colour }} className="inline-flex">
					<CoverageDots values={[false]} tone="map" size="sm" label="" />
				</span>
				Round below target
			</li>
			<li>{target}</li>
		</ul>
	);
}

export type Column<T> = {
	key: string;
	label: string;
	cell: (row: T) => ReactNode;
	mono?: boolean;
	numeric?: boolean;
	nowrap?: boolean;
	className?: string;
	/** Leave this column out of the stacked card, when the card's heading already says it. */
	hideInCard?: boolean;
};

export type RowsTableProps<T> = {
	caption: string;
	columns: Column<T>[];
	rows: T[];
	rowKey: (row: T) => string;
	/** The row drawn as selected: a well fill and the ink bar. */
	selectedKey?: string | null;
	/** Below 640 px each row becomes a card headed by this column. */
	cardTitle: (row: T) => ReactNode;
	className?: string;
};

/**
 * An island table that stacks below 640 px (DESIGN §4): each row becomes a card with its title on top
 * and the other columns as label and value lines. Put it in a flush Island.
 */
export function RowsTable<T>({ caption, columns, rows, rowKey, selectedKey, cardTitle, className }: RowsTableProps<T>) {
	return (
		<div className={className}>
			<div className="hidden sm:block">
				<Table caption={caption}>
					<THead>
						<tr>
							{columns.map(column => (
								<Th key={column.key} numeric={column.numeric} className={column.className}>
									{column.label}
								</Th>
							))}
						</tr>
					</THead>
					<TBody>
						{rows.map(row => (
							<Tr key={rowKey(row)} selected={selectedKey === rowKey(row)}>
								{columns.map(column => (
									<Td
										key={column.key}
										mono={column.mono}
										numeric={column.numeric}
										nowrap={column.nowrap}
										className={column.className}>
										{column.cell(row)}
									</Td>
								))}
							</Tr>
						))}
					</TBody>
				</Table>
			</div>
			<ul aria-label={caption} className="divide-y divide-rule sm:hidden">
				{rows.map(row => (
					<li
						key={rowKey(row)}
						className={cx(
							"flex flex-col gap-2 px-island-pad py-4",
							selectedKey === rowKey(row) && "bg-well selected-bar"
						)}>
						<div className="type-body font-semibold text-ink">{cardTitle(row)}</div>
						<dl className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-4 gap-y-1">
							{columns
								.filter(column => !column.hideInCard)
								.map(column => (
									<div key={column.key} className="col-span-2 grid grid-cols-subgrid items-baseline">
										<dt className="type-mono-label text-ink-2">{column.label}</dt>
										<dd
											className={cx(
												"min-w-0 text-ink",
												column.mono ? "type-mono-data" : "type-body"
											)}>
											{column.cell(row)}
										</dd>
									</div>
								))}
						</dl>
					</li>
				))}
			</ul>
		</div>
	);
}

/** The thumbnail's shape, the plan frame's 720 × 500. */
const THUMB_RATIO = 36 / 25;

/**
 * A site row's still plan (project-06): the site cropped to its own extent, so a small site such as Fall
 * Creek fills its thumbnail as the design draws it. Day palette, no labels, markers or controls.
 */
export function SiteThumbnail({ site, className }: { site: ProjectedSite; className?: string }) {
	const { minX, minY, maxX, maxY } = site.bounds;
	const pad = Math.max(maxX - minX, maxY - minY) * 0.06;
	let width = maxX - minX + pad * 2;
	let height = maxY - minY + pad * 2;
	// Widen the shorter side so the view keeps the thumbnail's shape and nothing is cropped.
	if (width / height < THUMB_RATIO) width = height * THUMB_RATIO;
	else height = width / THUMB_RATIO;
	const centreX = (minX + maxX) / 2;
	const centreY = (minY + maxY) / 2;
	return (
		<div
			aria-hidden="true"
			className={cx("aspect-[36/25] overflow-hidden rounded-thumb border border-line", className)}>
			<SitePlan
				site={site}
				palette="day"
				showLabels={false}
				detail="thumbnail"
				title={`${site.name} plan`}
				viewBox={[centreX - width / 2, centreY - height / 2, width, height]}
				fit="slice"
				className="size-full"
			/>
		</div>
	);
}
