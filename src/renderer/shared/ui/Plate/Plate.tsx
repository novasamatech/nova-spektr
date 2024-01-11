import { ElementType, PropsWithChildren } from 'react';

import { cnTw } from '@shared/lib/utils';

type Props = {
  as?: ElementType;
  className?: string;
};

export const Plate = ({ as: Tag = 'div', className, children }: PropsWithChildren<Props>) => (
  <Tag className={cnTw('p-3 rounded-md bg-white', className)}>{children}</Tag>
);
