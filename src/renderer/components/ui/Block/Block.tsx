import { PropsWithChildren } from 'react';

import cnTw from '@renderer/shared/utils/twMerge';

type Props = {
  className?: string;
};

const Block = ({ className = 'p-5', children }: PropsWithChildren<Props>) => (
  <div className={cnTw('w-full rounded-2lg bg-white shadow-surface', className)}>{children}</div>
);

export default Block;
