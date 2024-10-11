import { type ReactNode, memo, useMemo } from 'react';

type Props = {
  steps: number;
  min: number;
  stepSize: number;
  renderLabel?: (value: number, index: number) => ReactNode;
};

export const StepLabels = memo(({ steps, renderLabel, min, stepSize }: Props) => {
  const nodes = useMemo(() => {
    if (!renderLabel) {
      return [];
    }

    // for better visuals
    if (steps > 10) {
      return [];
    }

    return Array.from({ length: steps }).map((_, i) => {
      const value = min + i * stepSize;

      return (
        // eslint-disable-next-line react/no-array-index-key
        <div key={value} className="mx-1 flex h-fit w-2 justify-center">
          {renderLabel(value, i)}
        </div>
      );
    });
  }, [renderLabel, steps, min, stepSize]);

  if (nodes.length === 0) {
    return null;
  }

  return <div className="pointer-events-none flex w-full justify-between px-2">{nodes}</div>;
});
