import cn from 'classnames';
import { ElementType, PropsWithChildren } from 'react';

type Props = {
  as?: ElementType;
  className?: string;
};

const Plate = ({ as: Tag = 'div', className, children }: PropsWithChildren<Props>) => (
  <Tag className={cn('p-5 rounded-2lg bg-shade-2', className)}>{children}</Tag>
);

export default Plate;
