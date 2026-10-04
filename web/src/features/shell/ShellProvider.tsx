"use client";

import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";

type ShellUi = {
	paletteOpen: boolean;
	/** `restoreFocus: false` when the palette closes to move to another page, whose title takes focus. */
	setPaletteOpen: (open: boolean, options?: { restoreFocus?: boolean }) => void;
	shortcutsOpen: boolean;
	setShortcutsOpen: (open: boolean) => void;
};

const ShellContext = createContext<ShellUi | null>(null);

/**
 * The palette and the shortcuts dialog open from keys, the header and menus, with no Radix trigger of their
 * own, so this remembers what had focus when one opened and gives focus back to it when it closes.
 */
function useReturningFocus(): [boolean, (open: boolean, options?: { restoreFocus?: boolean }) => void] {
	const [open, setOpen] = useState(false);
	const returnTo = useRef<HTMLElement | null>(null);
	const change = useCallback((next: boolean, options?: { restoreFocus?: boolean }) => {
		if (next) {
			const active = document.activeElement;
			returnTo.current = active instanceof HTMLElement && active !== document.body ? active : null;
		} else {
			const target = returnTo.current;
			returnTo.current = null;
			// After the dialog has stopped trapping focus, which happens on the render that closes it.
			if (target && options?.restoreFocus !== false)
				window.setTimeout(() => {
					if (target.isConnected) target.focus();
				}, 0);
		}
		setOpen(next);
	}, []);
	return [open, change];
}

/** Who has the command palette and the shortcuts dialog open: the header, the keys and the menus share it. */
export function ShellProvider({ children }: { children: ReactNode }) {
	const [paletteOpen, setPaletteOpen] = useReturningFocus();
	const [shortcutsOpen, setShortcutsOpen] = useReturningFocus();
	const value = useMemo(
		() => ({ paletteOpen, setPaletteOpen, shortcutsOpen, setShortcutsOpen }),
		[paletteOpen, setPaletteOpen, shortcutsOpen, setShortcutsOpen]
	);
	return <ShellContext value={value}>{children}</ShellContext>;
}

export function useShell(): ShellUi {
	const shell = useContext(ShellContext);
	if (!shell) throw new Error("useShell needs a ShellProvider above it.");
	return shell;
}
