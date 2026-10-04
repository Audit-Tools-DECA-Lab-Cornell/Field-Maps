"use client";

import { useCallback, useEffect, useState } from "react";

/** "0:24": minutes and two-digit seconds, for a countdown read in mono. */
export function formatCountdown(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * A countdown that starts when `start` is called and reports the whole seconds left, then 0. It reads the
 * clock, so a background tab that sleeps through the timer still ends on time.
 */
export function useCooldown(seconds: number) {
	const [endsAt, setEndsAt] = useState<number | null>(null);
	const [now, setNow] = useState(0);

	useEffect(() => {
		if (endsAt === null) return;
		const timer = window.setInterval(() => {
			const time = Date.now();
			setNow(time);
			if (time >= endsAt) setEndsAt(null);
		}, 250);
		return () => window.clearInterval(timer);
	}, [endsAt]);

	const start = useCallback(() => {
		const time = Date.now();
		setNow(time);
		setEndsAt(time + seconds * 1000);
	}, [seconds]);

	const remaining = endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000));
	return { remaining, start };
}
