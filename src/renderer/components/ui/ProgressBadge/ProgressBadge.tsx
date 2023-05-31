import { PropsWithChildren } from 'react';

import cnTw from '@renderer/shared/utils/twMerge';

type Props = {
  progress: number;
  total: number;
  className?: string;
};

const ProgressBadge = ({ progress, total, className, children }: PropsWithChildren<Props>) => {
  const progressIsComplete = progress === total;

  return (
    <div className={cnTw('flex items-center w-max bg-white rounded-md', className)}>
      <p
        className={cnTw(
          'text-white font-semibold text-xs leading-[14px] rounded-md py-[3px] px-1.5 transition-colors',
          progressIsComplete ? 'bg-success' : 'bg-shade-30',
        )}
      >
        <span>{progress}</span>
        <span className="opacity-60">{' / '}</span>
        <span className="opacity-60">{total}</span>
      </p>
      <p className="p-1 text-neutral-variant text-2xs font-semibold">{children}</p>
    </div>
  );
};

export default ProgressBadge;
