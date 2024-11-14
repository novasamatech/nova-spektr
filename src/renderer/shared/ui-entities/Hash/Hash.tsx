import { memo } from 'react';

import { truncate } from '@/shared/lib/utils';

import { Truncate } from './Truncate';

type Props = {
  value: string;
  variant: 'full' | 'truncate' | 'short';
  testId?: string;
};

export const Hash = memo(({ value, variant, testId = 'Hash' }: Props) => {
  return (
    <span className="w-full text-inherit transition-colors" data-testid={testId}>
      {getVariant(variant, value)}
    </span>
  );
});

const getVariant = (variant: Props['variant'], value: string) => {
  if (variant === 'full') {
    return <span className="break-all">{value}</span>;
  }

  if (variant === 'truncate') {
    return <Truncate text={value} />;
  }

  if (variant === 'short') {
    return truncate(value, 8, 8);
  }

  return null;
};
