"use client";

import { useCallback, useEffect, useState } from "react";

/** "0:24": minutes and two-digit seconds, for a countdown read in mono. */
export function formatCountdown(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * A countdown the server starts: `initialSeconds` is what was left when the page rendered (the auth pages
 * read it from the `fm-email-sent` cookie), and `start(seconds)` restarts it from an action's `retryAfter`.
 * It reports the whole seconds left, then 0. It reads the clock, so a background tab that sleeps through
 * the timer still ends on time.
 */
export function useCooldown(initialSeconds = 0) {
	const [endsAt, setEndsAt] = useState<number | null>(() =>
		initialSeconds > 0 ? Date.now() + initialSeconds * 1000 : null
	);
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		if (endsAt === null) return;
		const timer = window.setInterval(() => {
			const time = Date.now();
			setNow(time);
			if (time >= endsAt) setEndsAt(null);
		}, 250);
		return () => window.clearInterval(timer);
	}, [endsAt]);

	const start = useCallback((seconds: number) => {
		if (!(seconds > 0)) return;
		const time = Date.now();
		setNow(time);
		setEndsAt(time + seconds * 1000);
	}, []);

	const remaining = endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000));
	return { remaining, start };
}
