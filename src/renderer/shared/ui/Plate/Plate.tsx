import { type ElementType, type PropsWithChildren } from 'react';

import { cnTw } from '@shared/lib/utils';

type Props = {
  as?: ElementType;
  className?: string;
};

export const Plate = ({ as: Tag = 'div', className, children }: PropsWithChildren<Props>) => (
  <Tag className={cnTw('rounded-md bg-white p-3', className)}>{children}</Tag>
);
