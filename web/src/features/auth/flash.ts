/** Where a message waits when the page that shows it belongs to another layout (see leaveFlash). */
export const FLASH_STORAGE_KEY = "fm.flash";

export type Flash = { title: string; description?: string };

/**
 * Keeps a toast for the next page when that page sits in another layout, so the toast host of this one
 * unmounts on the way (joining an invitation lands in the workspace; deleting an account lands on sign
 * in). The workspace and auth layouts' FlashToast reads `fm.flash` from sessionStorage on arrival, shows
 * it and clears it.
 */
export function leaveFlash(flash: Flash) {
	try {
		sessionStorage.setItem(FLASH_STORAGE_KEY, JSON.stringify(flash));
	} catch {
		// Storage can be refused in a private window; the message is a courtesy, not a record.
	}
}

/** Drops a message left for the next page, when the move it was meant for did not happen. */
export function clearFlash() {
	try {
		sessionStorage.removeItem(FLASH_STORAGE_KEY);
	} catch {
		// Nothing stored, or storage refused: nothing to clear.
	}
}
