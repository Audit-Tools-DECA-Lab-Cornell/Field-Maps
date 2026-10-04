/** Where a message waits when the page that shows it belongs to another layout (see leaveFlash). */
export const FLASH_STORAGE_KEY = "fm.flash";

export type Flash = { title: string; description?: string };

/**
 * Keeps a toast for the next page when that page sits outside the auth layout, so the auth layout's toast
 * host unmounts on the way (joining an invitation lands in the workspace). The workspace's toast host can
 * read `fm.flash` from sessionStorage on arrival, show it and clear it.
 */
export function leaveFlash(flash: Flash) {
	try {
		sessionStorage.setItem(FLASH_STORAGE_KEY, JSON.stringify(flash));
	} catch {
		// Storage can be refused in a private window; the message is a courtesy, not a record.
	}
}
