"use client";

import { Toast as ToastPrimitive } from "radix-ui";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

import { MOTION } from "@/lib/contour";
import { cx } from "@/lib/cx";

import { Icon } from "./Icon";
import { NOTE_ICON } from "./Note";
import { type Tone, TONE_SOFT, TONE_TEXT } from "./tone";

export type ToastTone = Tone | "neutral";

export type ToastActionOptions = {
	/** One or two words: "Undo". */
	label: string;
	onClick: () => void;
	/** Another way to do the same thing, for readers who cannot reach the toast in time: "Undo with ⌘Z". */
	altText?: string;
};

export type ToastOptions = {
	/** The change, confirmed in words: "OBS-0244 approved". */
	title: ReactNode;
	description?: ReactNode;
	/** Adds the state's glyph in a soft disc. neutral (the default) has no glyph. */
	tone?: ToastTone;
	action?: ToastActionOptions;
	/** Milliseconds on screen. Defaults to the contract's toast duration (6 s). */
	duration?: number;
};

type ShowToast = (options: ToastOptions) => string;

/** Call it to show a toast, or destructure `toast` from it; both are the same function. */
export type ToastApi = ShowToast & {
	toast: ShowToast;
	/** Close one toast by the id `toast` returned, or every toast. */
	dismiss: (id?: string) => void;
};

type ToastEntry = ToastOptions & { id: string; open: boolean };

const ToastContext = createContext<ToastApi | null>(null);

/* Ids only need to be unique within the page, so a module counter is enough. */
let lastToastId = 0;

function nextToastId(): string {
	lastToastId += 1;
	return `toast-${lastToastId}`;
}

/**
 * Holds the toast queue and the viewport. Place it once, in the root layout, around the page. One
 * toast shows at a time: a new one replaces the one on screen, which leaves with its exit motion.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<ToastEntry[]>([]);

	const dismiss = useCallback((id?: string) => {
		setToasts(list => list.map(entry => (id === undefined || entry.id === id ? { ...entry, open: false } : entry)));
	}, []);

	const api = useMemo<ToastApi>(() => {
		const show: ShowToast = options => {
			const id = nextToastId();
			// Drop toasts that have closed; the open one closes, leaving as this one enters.
			setToasts(list => [
				...list.filter(entry => entry.open).map(entry => ({ ...entry, open: false })),
				{ ...options, id, open: true }
			]);
			return id;
		};
		return Object.assign(show, { toast: show, dismiss });
	}, [dismiss]);

	return (
		<ToastContext.Provider value={api}>
			<ToastPrimitive.Provider duration={MOTION.toast} label="Notification">
				{children}
				{toasts.map(entry => (
					<ToastCard
						key={entry.id}
						entry={entry}
						onOpenChange={open => {
							if (!open) dismiss(entry.id);
						}}
					/>
				))}
				<ToastPrimitive.Viewport className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 md:right-auto md:items-start md:p-gutter" />
			</ToastPrimitive.Provider>
		</ToastContext.Provider>
	);
}

function ToastCard({ entry, onOpenChange }: { entry: ToastEntry; onOpenChange: (open: boolean) => void }) {
	const tone = entry.tone ?? "neutral";

	// A toast confirms a change the reader made, so it is announced politely: Radix's "background" type.
	return (
		<ToastPrimitive.Root
			open={entry.open}
			onOpenChange={onOpenChange}
			duration={entry.duration}
			type="background"
			className={cx(
				"pointer-events-auto flex w-fit max-w-full items-center gap-3 rounded-panel bg-ink px-4 py-3 text-on-ink md:max-w-md",
				// Inside the ink fill the focus ring takes the gap colour, so it shows.
				"[--ct-focus:var(--ct-focus-gap)]",
				"data-[state=open]:animate-rise-in data-[state=closed]:animate-rise-out",
				"data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x) data-[swipe=end]:translate-x-(--radix-toast-swipe-end-x)",
				"data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-[translate] data-[swipe=cancel]:duration-(--ct-duration-quick) data-[swipe=cancel]:ease-standard"
			)}>
			{tone !== "neutral" && (
				<span
					className={cx(
						"grid size-6 shrink-0 place-items-center rounded-full",
						TONE_SOFT[tone],
						TONE_TEXT[tone]
					)}>
					<Icon name={NOTE_ICON[tone]} size={16} />
				</span>
			)}
			<div className="min-w-0 flex-1">
				<ToastPrimitive.Title className="type-body">{entry.title}</ToastPrimitive.Title>
				{entry.description != null && (
					<ToastPrimitive.Description className="type-small">{entry.description}</ToastPrimitive.Description>
				)}
			</div>
			{entry.action && (
				// -my-2.5 keeps the 44 px target without making the toast taller than its text.
				<ToastPrimitive.Action
					altText={entry.action.altText ?? entry.action.label}
					onClick={entry.action.onClick}
					className={cx(
						"-my-2.5 inline-flex min-h-touch shrink-0 items-center rounded-pill px-3 type-body font-semibold",
						"underline decoration-1 underline-offset-4 hover:bg-on-ink/12 hover:decoration-2 active:bg-on-ink/20",
						"transition-[background-color] duration-(--ct-duration-quick) ease-standard"
					)}>
					{entry.action.label}
				</ToastPrimitive.Action>
			)}
		</ToastPrimitive.Root>
	);
}

/**
 * Shows a toast: an ink card at the bottom of the screen (centred on phones, at the left on wider
 * screens) that confirms a change and may offer Undo. It never takes focus, pauses while hovered or
 * focused, and leaves after six seconds.
 */
export function useToast(): ToastApi {
	const api = useContext(ToastContext);
	if (!api) throw new Error("useToast needs a ToastProvider above it in the tree.");
	return api;
}
