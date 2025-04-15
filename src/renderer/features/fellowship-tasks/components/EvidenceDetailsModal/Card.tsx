import { type PropsWithChildren, memo } from 'react';

type Props = PropsWithChildren;

export const Card = memo(({ children }: Props) => {
  return (
    <div className="rounded-lg border border-filter-border bg-card-background p-6 shadow-shadow-1">{children}</div>
  );
});
