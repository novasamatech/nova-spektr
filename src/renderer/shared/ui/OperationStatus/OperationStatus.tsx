import { type PropsWithChildren } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { CaptionText } from '../Typography';

type Pallet = 'default' | 'success' | 'error';

const StatusColor: Record<Pallet, string> = {
  default: 'text-text-secondary',
  success: 'text-text-positive',
  error: 'text-text-negative',
};

type Props = {
  pallet: Pallet;
  className?: string;
};

export const OperationStatus = ({ pallet, className, children }: PropsWithChildren<Props>) => {
  return (
    <div className="flex h-5 w-fit items-center rounded-[20px] border border-shade-8 px-2.5">
      <CaptionText align="center" className={cnTw('uppercase', StatusColor[pallet], className)}>
        {children}
      </CaptionText>
    </div>
  );
};
