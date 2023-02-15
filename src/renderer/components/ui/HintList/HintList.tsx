import cn from 'classnames';
import { PropsWithChildren } from 'react';

import HintItem from './HintItem';

type Props = {
  className?: string;
};

const HintList = ({ className, children }: PropsWithChildren<Props>) => (
  <ul className={cn('flex flex-col gap-y-1 list-none', className)}>{children}</ul>
);

HintList.Item = HintItem;

export default HintList;
