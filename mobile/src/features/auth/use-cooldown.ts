import { useCallback, useEffect, useState } from "react";

/**
 * A countdown that starts when `start` is called and reports the whole seconds left, then 0. It reads
 * the clock rather than counting ticks, so an app that sleeps through it still ends on time.
 */
export function useCooldown(seconds: number, startNow = false) {
  const [endsAt, setEndsAt] = useState<number | null>(() =>
    startNow ? Date.now() + seconds * 1000 : null,
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endsAt === null) return;
    const timer = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= endsAt) setEndsAt(null);
    }, 250);
    return () => clearInterval(timer);
  }, [endsAt]);

  const start = useCallback(() => {
    const time = Date.now();
    setNow(time);
    setEndsAt(time + seconds * 1000);
  }, [seconds]);

  const remaining = endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000));
  return { remaining, start };
}
