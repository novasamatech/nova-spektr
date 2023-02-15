import cn from 'classnames';
import { PropsWithChildren } from 'react';

type Props = {
  className?: string;
};

const HintItem = ({ className, children }: PropsWithChildren<Props>) => (
  <li className={cn('flex items-center text-shade-40 text-xs', className)}>
    <span className="w-1.5 h-1.5 rounded-full border-2 border-shade-40 mr-1" />
    {children}
  </li>
);

export default HintItem;
