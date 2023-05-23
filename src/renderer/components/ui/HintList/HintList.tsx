import { PropsWithChildren } from 'react';

import cnTw from '@renderer/shared/utils/twMerge';
import HintItem from './HintItem';

type Props = {
  className?: string;
};

const HintList = ({ className, children }: PropsWithChildren<Props>) => (
  <ul className={cnTw('flex flex-col gap-y-1 list-none', className)}>{children}</ul>
);

HintList.Item = HintItem;

export default HintList;
