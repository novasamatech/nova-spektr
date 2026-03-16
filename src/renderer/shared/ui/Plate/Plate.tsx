import { type ElementType, type PropsWithChildren } from 'react';

import { cnTw } from '@/shared/lib/utils';

type Props = {
  as?: ElementType;
  className?: string;
  onClick?: () => void;
};

export const Plate = ({ as: Tag = 'div', className, children, onClick }: PropsWithChildren<Props>) => (
  <Tag className={cnTw('rounded-md bg-card-background p-3', onClick && 'cursor-pointer', className)} onClick={onClick}>
    {children}
  </Tag>
);
