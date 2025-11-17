import { useDeferredValue, useEffect, useState } from 'react';

export const useClock = (tick: number) => {
  const [state, setState] = useState<number>(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setState(Date.now());
    }, tick);

    return () => {
      clearInterval(interval);
    };
  }, [tick]);

  return useDeferredValue(state, state);
};
