"use client";

import { type KeyboardEvent, useRef } from "react";

import type { RawQuestion } from "@/components/studio/model";
import { cx } from "@/lib/cx";

import { questionNumber } from "./model";
import { VersionStateText } from "./parts";

/* Keys typed into a field belong to the field, never to the list. */
const TYPING = "input, textarea, select, [contenteditable]:not([contenteditable='false'])";

/**
 * The draft's questions as a single-choice list (project-13): numbered, with whether each is required
 * and always asked, and a "Changed" marker against the published version. The list is one tab stop;
 * ↑ / ↓ (or j / k), Home and End move the selection, and focus follows it.
 */
export function QuestionList({
	questions,
	selectedId,
	changed,
	unsaved,
	onSelect
}: {
	questions: readonly RawQuestion[];
	selectedId: string | null;
	changed: ReadonlySet<string>;
	unsaved: ReadonlySet<string>;
	onSelect: (id: string) => void;
}) {
	const listRef = useRef<HTMLUListElement>(null);
	const selectedIndex = questions.findIndex(question => question.id === selectedId);
	const tabStop = selectedIndex >= 0 ? selectedIndex : 0;

	function move(event: KeyboardEvent<HTMLUListElement>) {
		if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
		if ((event.target as HTMLElement).closest(TYPING)) return;
		let next: number;
		switch (event.key) {
			case "ArrowDown":
			case "j":
				next = Math.min(tabStop + 1, questions.length - 1);
				break;
			case "ArrowUp":
			case "k":
				next = Math.max(tabStop - 1, 0);
				break;
			case "Home":
				next = 0;
				break;
			case "End":
				next = questions.length - 1;
				break;
			default:
				return;
		}
		event.preventDefault();
		const question = questions[next];
		if (!question) return;
		onSelect(question.id);
		listRef.current?.querySelector<HTMLElement>(`[data-index="${next}"]`)?.focus();
	}

	return (
		<ul
			ref={listRef}
			role="listbox"
			aria-label="Questions in this version"
			onKeyDown={move}
			className="divide-y divide-rule">
			{questions.map((question, index) => {
				const selected = index === selectedIndex;
				return (
					<li
						key={question.id}
						role="option"
						aria-selected={selected}
						tabIndex={index === tabStop ? 0 : -1}
						data-index={index}
						onClick={() => onSelect(question.id)}
						onFocus={() => {
							if (!selected) onSelect(question.id);
						}}
						className={cx(
							"grid cursor-pointer grid-cols-[2rem_minmax(0,1fr)] items-baseline gap-x-3 px-5 py-3",
							"[--ct-size-focus-gap:calc(var(--ct-size-focus-ring)*-2)]",
							"transition-[background-color] duration-(--ct-duration-quick) ease-standard",
							selected ? "bg-well selected-bar" : "hover:bg-ground"
						)}>
						<span className="type-mono-data text-ink-2">{questionNumber(index)}</span>
						<span className="min-w-0">
							<span className="block type-body font-semibold text-ink">
								{question.label || <span className="text-ink-2">No label yet</span>}
							</span>
							<span className="flex flex-wrap items-baseline gap-x-3 type-small text-ink-2">
								<span>
									{question.required ? "Required" : "Optional"} ·{" "}
									{question.dependsOn ? "Conditional" : "Always visible"}
								</span>
								{changed.has(question.id) && (
									<VersionStateText state="draft" label="Changed" className="text-sm" />
								)}
								{unsaved.has(question.id) && <span className="font-semibold text-ink">Unsaved</span>}
							</span>
						</span>
					</li>
				);
			})}
		</ul>
	);
}
