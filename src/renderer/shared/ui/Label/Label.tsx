import { PropsWithChildren } from 'react';

import { CaptionText } from '@renderer/shared/ui';
import { cnTw } from '@renderer/shared/lib/utils';
import { LabelStyles, LabelPallet } from './constants';

type Props = {
  className?: string;
  pallet?: LabelPallet;
};

export const Label = ({ className, children, pallet = 'default' }: PropsWithChildren<Props>) => (
  <div className={cnTw('rounded-lg py-0.5b px-2b group', LabelStyles[pallet], className)} data-testid="label">
    <CaptionText className="uppercase">{children}</CaptionText>
  </div>
);
