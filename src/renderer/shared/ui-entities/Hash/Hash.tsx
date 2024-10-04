import { memo } from 'react';

import { Truncate } from './Truncate';

type Props = {
  value: string;
  variant: 'full' | 'truncate';
  testId?: string;
};

export const Hash = memo<Props>(({ value, variant, testId = 'Hash' }) => {
  return (
    <span className="w-full text-inherit transition-colors" data-testid={testId}>
      {variant === 'truncate' ? <Truncate text={value} /> : <span className="break-all">{value}</span>}
    </span>
  );
});
