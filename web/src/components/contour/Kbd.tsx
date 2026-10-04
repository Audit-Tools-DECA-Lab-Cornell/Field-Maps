import type { ComponentPropsWithRef } from "react";

import { cx } from "@/lib/cx";

export type KbdProps = ComponentPropsWithRef<"kbd">;

/** A key or key combination, as in the header search ("⌘K"): mono in a small chip with 6 px corners. */
export function Kbd({ className, children, ...rest }: KbdProps) {
	return (
		<kbd
			{...rest}
			className={cx(
				"inline-flex items-center rounded-[6px] border border-line px-1.5 font-mono text-xs leading-5 whitespace-nowrap text-ink-2",
				className
			)}>
			{children}
		</kbd>
	);
}

export type ShortcutHintProps = {
	/** The key pressed with Command or Control. */
	shortcut?: string;
	className?: string;
};

/**
 * A Command or Control shortcut, as this platform writes it: "⌘K" on a Mac, "Ctrl K" elsewhere. Both
 * render; the platform attribute set before first paint hides one, so server and client markup match.
 */
export function ShortcutHint({ shortcut = "K", className }: ShortcutHintProps) {
	return (
		<Kbd className={className}>
			<span className="kbd-mac">
				<span aria-hidden="true">⌘{shortcut}</span>
				<span className="sr-only">Command {shortcut}</span>
			</span>
			<span className="kbd-other">Ctrl {shortcut}</span>
		</Kbd>
	);
}
