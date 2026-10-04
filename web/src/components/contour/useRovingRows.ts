import { type KeyboardEvent, useRef } from "react";

export type RovingRowsOptions = {
	/** Number of body rows. */
	count: number;
	/** The selected row, or -1 when nothing is selected. */
	selectedIndex: number;
	/** Select a row. Arrow keys, j / k, Home and End call it; so does a click on the row. */
	onSelect: (index: number) => void;
	/** Open a row: Enter on the focused row. */
	onOpen?: (index: number) => void;
};

/** Spread onto a `Tr`: its place in the tab order, its selected look and its click. */
export type RovingRowProps = {
	tabIndex: 0 | -1;
	selected: boolean;
	onSelect: () => void;
	"data-row-index": number;
};

/* Keys typed into a field inside a row belong to the field, never to the table. */
const TYPING = "input, textarea, select, [contenteditable]:not([contenteditable='false'])";

/**
 * Roving focus for an island table (DESIGN §5, Data): the table is one tab stop, ↑ / ↓ or j / k move the
 * selection, Home and End jump to the ends, and Enter opens the row. Focus moves with the selection, so
 * the selected row is the focused row. Spread `bodyProps` on the `TBody` and `rowProps(index)` on each
 * `Tr`.
 */
export function useRovingRows({ count, selectedIndex, onSelect, onOpen }: RovingRowsOptions) {
	const bodyRef = useRef<HTMLTableSectionElement>(null);

	// The row that takes Tab: the selected one, or the first when nothing is selected.
	const tabStop = count === 0 ? -1 : selectedIndex >= 0 && selectedIndex < count ? selectedIndex : 0;

	function focusRow(index: number) {
		bodyRef.current?.querySelector<HTMLElement>(`:scope > [data-row-index="${index}"]`)?.focus();
	}

	function onKeyDown(event: KeyboardEvent<HTMLTableSectionElement>) {
		if (count === 0 || event.defaultPrevented) return;
		if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
		const target = event.target as HTMLElement;
		if (target.closest(TYPING)) return;

		const row = target.closest<HTMLElement>("[data-row-index]");
		const from = row ? Number(row.dataset.rowIndex) : tabStop;
		// With nothing selected yet, the first move selects the row that has focus.
		const fresh = selectedIndex < 0 || selectedIndex >= count;
		let next: number;
		switch (event.key) {
			case "ArrowDown":
			case "j":
				next = fresh ? from : Math.min(from + 1, count - 1);
				break;
			case "ArrowUp":
			case "k":
				next = fresh ? from : Math.max(from - 1, 0);
				break;
			case "Home":
				next = 0;
				break;
			case "End":
				next = count - 1;
				break;
			case "Enter":
				// Enter on a link or button inside the row is that control's own.
				if (row && target === row && onOpen) {
					event.preventDefault();
					onOpen(from);
				}
				return;
			default:
				return;
		}

		event.preventDefault();
		if (next !== selectedIndex) onSelect(next);
		focusRow(next);
	}

	function rowProps(index: number): RovingRowProps {
		return {
			tabIndex: index === tabStop ? 0 : -1,
			selected: index === selectedIndex,
			onSelect: () => onSelect(index),
			"data-row-index": index
		};
	}

	return { bodyProps: { ref: bodyRef, onKeyDown }, rowProps };
}
