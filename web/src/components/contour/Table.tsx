"use client";

import { useRouter } from "next/navigation";
import { type ComponentPropsWithRef, type MouseEvent, type ReactNode, useEffect, useRef, useState } from "react";

import { cx } from "@/lib/cx";

export type TableProps = {
	/** Names the table for assistive technology. It is not shown: the island title names it on screen. */
	caption?: string;
	children: ReactNode;
} & Omit<ComponentPropsWithRef<"table">, "children">;

/**
 * An island table (system-05, project-02): mono column labels, ruled rows at least 54 px tall, and first
 * and last cells aligned with the island padding. Place it in a flush Island. A table too wide for the
 * screen scrolls sideways inside its island, and then it takes keyboard focus, so the arrow keys can scroll it.
 */
export function Table({ caption, className, children, ...rest }: TableProps) {
	const scroller = useRef<HTMLDivElement>(null);
	const [scrolls, setScrolls] = useState(false);

	// Only a table that overflows becomes a tab stop; one that fits is not, and the stop would lead nowhere.
	useEffect(() => {
		const element = scroller.current;
		if (!element || typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(() => setScrolls(element.scrollWidth > element.clientWidth));
		observer.observe(element);
		if (element.firstElementChild) observer.observe(element.firstElementChild);
		return () => observer.disconnect();
	}, []);

	return (
		<div
			ref={scroller}
			tabIndex={scrolls ? 0 : undefined}
			role={scrolls && caption ? "region" : undefined}
			aria-label={scrolls ? caption : undefined}
			// The island clips an outside ring, so a focused scroller draws it 3 px inside its edges.
			className="overflow-x-auto focus-visible:[--ct-size-focus-gap:calc(var(--ct-size-focus-ring)*-2)]">
			{/* Without a header row, the island's own rule sits above the first row, so that row drops its rule. */}
			<table
				{...rest}
				className={cx(
					"w-full border-collapse text-left",
					"[&>tbody:not(thead+tbody)>tr:first-child>td]:border-t-0",
					className
				)}>
				{caption && <caption className="sr-only">{caption}</caption>}
				{children}
			</table>
		</div>
	);
}

export function THead(props: ComponentPropsWithRef<"thead">) {
	return <thead {...props} />;
}

export function TBody(props: ComponentPropsWithRef<"tbody">) {
	return <tbody {...props} />;
}

export type TrProps = {
	/** The selected row: a well fill and the 4 px ink bar on its leading edge. */
	selected?: boolean;
	/** Select the row on click. Clicks on links, buttons and fields inside the row stay theirs. */
	onSelect?: () => void;
	/**
	 * Open this address on click; with ⌘ or Ctrl, in a new tab. Keep a real link to it in the row (the
	 * OBS- ID) for keyboard and screen-reader readers.
	 */
	href?: string;
	/** Show the pointer and hover fill without a handler here, when a parent handles the row. */
	interactive?: boolean;
} & Omit<ComponentPropsWithRef<"tr">, "onSelect">;

/* A press inside one of these is the control's, not the row's. */
const CONTROL =
	"a, button, input, select, textarea, label, summary, [role='button'], [role='link'], [role='checkbox'], [contenteditable='true']";

export function Tr({ selected = false, onSelect, href, interactive, className, onClick, ...rest }: TrProps) {
	const router = useRouter();
	const clickable = interactive ?? Boolean(onSelect || href);

	function handleClick(event: MouseEvent<HTMLTableRowElement>) {
		onClick?.(event);
		if (event.defaultPrevented) return;
		const control = (event.target as Element).closest(CONTROL);
		if (control && event.currentTarget.contains(control)) return;
		// A drag that selected text is reading, not choosing.
		if (window.getSelection()?.toString()) return;
		onSelect?.();
		if (!href) return;
		if (event.metaKey || event.ctrlKey) window.open(href, "_blank", "noopener");
		else router.push(href);
	}

	return (
		<tr
			{...rest}
			aria-selected={onSelect ? selected : undefined}
			onClick={onSelect || href ? handleClick : onClick}
			className={cx(
				// A full-bleed row draws its focus ring 3 px inside its edges.
				"[--ct-size-focus-gap:calc(var(--ct-size-focus-ring)*-2)]",
				"transition-[background-color] duration-(--ct-duration-quick) ease-standard",
				selected ? "bg-well [&>:first-child]:selected-bar" : clickable && "hover:bg-ground",
				clickable && "cursor-pointer",
				className
			)}
		/>
	);
}

export type ThProps = {
	/** Right-align the label over a column of numbers. */
	numeric?: boolean;
} & ComponentPropsWithRef<"th">;

/** A column label: mono, uppercase by style. Type it in normal case so it is read as words. */
export function Th({ numeric = false, scope = "col", className, ...rest }: ThProps) {
	return (
		<th
			scope={scope}
			{...rest}
			className={cx(
				"h-9 px-3 py-2 align-middle type-mono-label text-ink-2 first:pl-island-pad last:pr-island-pad",
				numeric ? "text-right" : "text-left",
				className
			)}
		/>
	);
}

export type TdProps = {
	/** IDs, versions and sizes: OBS-0244, v3, 84 MB. */
	mono?: boolean;
	/** Right-aligned tabular figures, so compared numbers line up. */
	numeric?: boolean;
	/** Keep the cell on one line. For short values only; labels otherwise wrap. */
	nowrap?: boolean;
} & ComponentPropsWithRef<"td">;

export function Td({ mono = false, numeric = false, nowrap = false, className, ...rest }: TdProps) {
	return (
		<td
			{...rest}
			className={cx(
				"h-table-row border-t border-rule px-3 py-2 align-middle text-ink first:pl-island-pad last:pr-island-pad",
				mono ? "type-mono-data" : "type-body",
				numeric && "text-right tnum",
				nowrap && "whitespace-nowrap",
				className
			)}
		/>
	);
}
