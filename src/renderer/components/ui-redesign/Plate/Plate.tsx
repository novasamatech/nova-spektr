import cn from 'classnames';
import { ElementType, PropsWithChildren } from 'react';

type Props = {
  as?: ElementType;
  className?: string;
};

const Plate = ({ as: Tag = 'div', className, children }: PropsWithChildren<Props>) => (
  <Tag className={cn('p-3 rounded-md bg-white', className)}>{children}</Tag>
);

export default Plate;
