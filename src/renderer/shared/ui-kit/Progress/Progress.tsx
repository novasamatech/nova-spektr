import * as RadixProgress from '@radix-ui/react-progress';
import { memo } from 'react';

const PRECISION = 10 ** 4;

type Props = {
  value: number;
  max: number;
};

export const Progress = memo(({ value, max = 100 }: Props) => {
  const progress = ((PRECISION / (max * PRECISION)) * (value * PRECISION)) / (PRECISION / 100);

  return (
    <RadixProgress.Root
      className="bg-secondary-button-background h-0.5 w-full overflow-hidden rounded-full"
      value={value}
      max={max}
    >
      <RadixProgress.Indicator
        className="bg-primary-button-background-default h-full rounded-full transition-transform"
        style={{ transform: `translateX(-${100 - progress}%)` }}
      />
    </RadixProgress.Root>
  );
});
