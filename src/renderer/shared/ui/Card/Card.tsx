import { type ElementType, type PropsWithChildren } from 'react';

import { cnTw } from '@shared/lib/utils';

type Props = {
  as?: ElementType;
  className?: string;
};

export const Card = ({ as: Tag = 'div', className, children }: PropsWithChildren<Props>) => (
  <Tag className={cnTw('rounded border border-container-border bg-white p-4 shadow-card-shadow', className)}>
    {children}
  </Tag>
);
