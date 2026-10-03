"use client";

import { ToggleGroup } from "radix-ui";
import { useEffect, useLayoutEffect, useRef } from "react";

import { cx } from "@/lib/cx";

import { Icon, type IconName } from "./Icon";

export type SegmentedOption = { value: string; label: string; icon?: IconName };

export type SegmentedProps = {
	value: string;
	onValueChange: (value: string) => void;
	options: SegmentedOption[];
	/** Names the group for assistive technology, such as "Preferred hand". */
	label: string;
	/** md has 44 px segments for web toolbars; lg has 48 px segments for settings. */
	size?: "md" | "lg";
	/** Stretch to the container's width. Segments stay equal either way. */
	fullWidth?: boolean;
	disabled?: boolean;
	className?: string;
};

const SEGMENT_HEIGHT = { md: "h-11", lg: "h-12" } as const;

/**
 * Writes the chosen segment's offset and width to the root as CSS variables, where the ink pill reads
 * them, and marks the root measured so the segment hands its own fill over to the pill.
 */
function placePill(root: HTMLElement) {
	const chosen = root.querySelector<HTMLElement>('[role="radio"][data-state="on"]');
	if (!chosen) {
		root.removeAttribute("data-measured");
		return;
	}
	root.style.setProperty("--segment-x", `${chosen.offsetLeft}px`);
	root.style.setProperty("--segment-width", `${chosen.offsetWidth}px`);
	root.setAttribute("data-measured", "");
}

/**
 * A pill of equal segments with one chosen: the chosen segment is an ink pill with a check. When the
 * choice changes, the pill slides to it. Before the first measure (and without JavaScript) the chosen
 * segment draws its own fill, and the first paint never slides. Arrow keys move between segments.
 */
export function Segmented({
	value,
	onValueChange,
	options,
	label,
	size = "md",
	fullWidth = false,
	disabled = false,
	className
}: SegmentedProps) {
	const rootRef = useRef<HTMLDivElement>(null);

	// Measure after layout and before paint, so the pill is never drawn in the old place.
	useLayoutEffect(() => {
		if (rootRef.current) placePill(rootRef.current);
	}, [value, options]);

	// Sliding starts after the first paint. A change of size (fonts loading, a resized container) moves the
	// pill without a slide.
	useEffect(() => {
		const root = rootRef.current;
		if (!root) return;
		root.setAttribute("data-animate", "");
		if (typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(() => {
			root.removeAttribute("data-animate");
			placePill(root);
			root.getBoundingClientRect(); // apply the new place before sliding is allowed again
			root.setAttribute("data-animate", "");
		});
		observer.observe(root);
		return () => observer.disconnect();
	}, []);

	return (
		<ToggleGroup.Root
			ref={rootRef}
			type="single"
			value={value}
			// A segmented control always has a choice: pressing the chosen segment again keeps it.
			onValueChange={next => {
				if (next) onValueChange(next);
			}}
			aria-label={label}
			disabled={disabled}
			className={cx(
				"group/segmented relative grid auto-cols-fr grid-flow-col rounded-pill border border-line bg-island p-1",
				fullWidth ? "w-full" : "w-fit",
				disabled && "opacity-50",
				className
			)}>
			<span
				aria-hidden="true"
				className={cx(
					"pointer-events-none absolute inset-y-1 left-0 hidden w-(--segment-width) translate-x-(--segment-x) rounded-pill bg-ink",
					"group-data-[measured]/segmented:block",
					"group-data-[animate]/segmented:transition-[translate,width] group-data-[animate]/segmented:duration-(--ct-duration-base) group-data-[animate]/segmented:ease-standard"
				)}
			/>
			{options.map(option => {
				const chosen = option.value === value;
				const glyph = chosen ? "check" : option.icon;
				return (
					<ToggleGroup.Item
						key={option.value}
						value={option.value}
						className={cx(
							"relative grid place-items-center rounded-pill px-5 text-base font-semibold",
							SEGMENT_HEIGHT[size],
							"transition-[color,background-color] duration-(--ct-duration-base) ease-standard",
							"data-[state=off]:text-ink data-[state=off]:not-disabled:hover:bg-well",
							"data-[state=on]:bg-ink data-[state=on]:text-on-ink group-data-[measured]/segmented:data-[state=on]:bg-transparent",
							"not-disabled:active:opacity-90 disabled:cursor-not-allowed"
						)}>
						{/* Both layers share one cell. The hidden one always holds the check, so a segment keeps its
						    width whether or not it is chosen. */}
						<span
							aria-hidden="true"
							className="invisible col-start-1 row-start-1 inline-flex items-center gap-2">
							<Icon name="check" size={16} />
							{option.label}
						</span>
						<span className="col-start-1 row-start-1 inline-flex items-center gap-2">
							{glyph && <Icon name={glyph} size={16} />}
							{option.label}
						</span>
					</ToggleGroup.Item>
				);
			})}
		</ToggleGroup.Root>
	);
}
