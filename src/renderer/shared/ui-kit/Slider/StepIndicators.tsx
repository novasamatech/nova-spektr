import { memo, useMemo } from 'react';

import { maxIndicationDensity } from './constants';

type Props = {
  steps: number;
};

export const StepIndicators = memo<Props>(({ steps }) => {
  const nodes = useMemo(() => {
    // for better visuals
    if (steps > maxIndicationDensity) {
      return [];
    }

    return Array.from({ length: steps }).map((_, i) => (
      // eslint-disable-next-line react/no-array-index-key
      <div key={i} className="mx-1.5 h-1 w-1 rounded-full bg-icon-button" />
    ));
  }, [steps]);

  if (nodes.length === 0) {
    return null;
  }

  return <div className="pointer-events-none absolute flex w-full justify-between">{nodes}</div>;
});
