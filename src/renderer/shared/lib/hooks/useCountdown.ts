import { useCallback, useEffect, useState } from 'react';

/**
 * Countdown timer in seconds. Callers provide the duration via
 * resetCountdown(seconds).
 *
 * @returns {Array | undefined} Countdown, resetCountdown
 */
export function useCountdown(): [number | null, (seconds: number) => void] {
  const [countdown, setCountdown] = useState<number | null>(null);

  const resetCountdown = useCallback((seconds: number) => {
    setCountdown(seconds);
  }, []);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [countdown]);

  return [countdown, resetCountdown];
}
