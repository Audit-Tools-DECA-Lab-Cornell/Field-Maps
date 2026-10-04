"use client";

import { useEffect } from "react";

import { useToast } from "@/components/contour/Toast";
import { type Flash, FLASH_STORAGE_KEY } from "@/features/auth/flash";

/**
 * Shows the message a page outside the workspace left for it (an accepted invitation, see
 * features/auth/flash.ts), once, then forgets it.
 */
export function FlashToast() {
	const { toast } = useToast();
	useEffect(() => {
		let flash: Flash | null = null;
		try {
			const raw = sessionStorage.getItem(FLASH_STORAGE_KEY);
			sessionStorage.removeItem(FLASH_STORAGE_KEY);
			flash = raw ? (JSON.parse(raw) as Flash) : null;
		} catch {
			flash = null;
		}
		if (flash?.title) toast({ title: flash.title, description: flash.description });
	}, [toast]);
	return null;
}
