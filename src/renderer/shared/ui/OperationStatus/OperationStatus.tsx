import { type PropsWithChildren } from 'react';

import { cnTw } from '@shared/lib/utils';
import { CaptionText } from '@shared/ui';

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
    <div className="flex items-center h-5 px-2.5 rounded-[20px] border border-shade-8">
      <CaptionText align="center" className={cnTw('uppercase', StatusColor[pallet], className)}>
        {children}
      </CaptionText>
    </div>
  );
};
