import { ElementType, PropsWithChildren } from 'react';

import cnTw from '@renderer/shared/utils/twMerge';

type Props = {
  as?: ElementType;
  className?: string;
};

const Plate = ({ as: Tag = 'div', className, children }: PropsWithChildren<Props>) => (
  <Tag className={cnTw('p-5 rounded-2lg bg-shade-2', className)}>{children}</Tag>
);

export default Plate;
