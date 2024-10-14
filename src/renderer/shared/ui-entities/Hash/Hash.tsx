import { memo } from 'react';

import { Truncate } from './Truncate';

type Props = {
  value: string;
  variant: 'full' | 'truncate';
  testId?: string;
};

export const Hash = memo(({ value, variant, testId = 'Hash' }: Props) => {
  return (
    <span className="w-full font-mono text-inherit transition-colors" data-testid={testId}>
      {variant === 'truncate' ? <Truncate text={value} /> : <span className="break-all">{value}</span>}
    </span>
  );
});
