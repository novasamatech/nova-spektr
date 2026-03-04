import { useCallback, useEffect, useState } from 'react';

/**
 * Countdown timer in seconds. Starts as null until resetCountdown(seconds) is
 * called.
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
