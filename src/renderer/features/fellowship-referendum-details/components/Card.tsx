import { type PropsWithChildren } from 'react';

export const Card = ({ children }: PropsWithChildren) => {
  return <div className="shadow-shadow-1 border-filter-border bg-card-background rounded-lg border">{children}</div>;
};
