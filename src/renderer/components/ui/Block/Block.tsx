import cn from 'classnames';
import { PropsWithChildren } from 'react';

type Props = {
  className?: string;
};

const Block = ({ className = 'p-5', children }: PropsWithChildren<Props>) => (
  <div className={cn('w-full rounded-2lg bg-white shadow-surface', className)}>{children}</div>
);

export default Block;
