import { type PropsWithChildren } from 'react';

import { cnTw } from '@/shared/lib/utils';

type Props = PropsWithChildren<{
  height?: 'auto' | 'full';
}>;

export const Card = ({ children, height = 'auto' }: Props) => {
  return (
    <div
      className={cnTw('rounded-lg border border-filter-border bg-card-background shadow-shadow-1', {
        'h-full': height === 'full',
      })}
    >
      {children}
    </div>
  );
};
