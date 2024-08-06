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
      <div key={i} className="h-1 w-1 mx-1.5 rounded-full bg-icon-button" />
    ));
  }, [steps]);

  if (nodes.length === 0) {
    return null;
  }

  return <div className="flex absolute w-full justify-between pointer-events-none">{nodes}</div>;
});
