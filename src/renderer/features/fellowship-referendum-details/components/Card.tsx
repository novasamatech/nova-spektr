import { type PropsWithChildren } from 'react';

export const Card = ({ children }: PropsWithChildren) => {
  return <div className="border-filter-border bg-card-background shadow-shadow-1 rounded-lg border">{children}</div>;
};
