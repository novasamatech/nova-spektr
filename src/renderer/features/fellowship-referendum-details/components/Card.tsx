import { type PropsWithChildren } from 'react';

export const Card = ({ children }: PropsWithChildren) => {
  return <div className="rounded-lg border border-filter-border bg-card-background shadow-shadow-1">{children}</div>;
};
