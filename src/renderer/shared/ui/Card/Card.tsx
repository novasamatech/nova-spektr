import { type ElementType, type PropsWithChildren } from 'react';

import { cnTw } from '@shared/lib/utils';

type Props = {
  as?: ElementType;
  className?: string;
};

export const Card = ({ as: Tag = 'div', className, children }: PropsWithChildren<Props>) => (
  <Tag className={cnTw('p-4 rounded bg-white border border-container-border shadow-card-shadow', className)}>
    {children}
  </Tag>
);
