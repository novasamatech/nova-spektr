import { PropsWithChildren } from 'react';

import { CaptionText } from '@renderer/shared/ui';
import { cnTw } from '@renderer/shared/lib/utils';
import { LabelStyle, LabelTextStyle, LabelPallet } from './constants';

type Props = {
  className?: string;
  pallet?: LabelPallet;
};

export const Label = ({ className, children, pallet = 'default' }: PropsWithChildren<Props>) => (
  <div className={cnTw('rounded-lg py-0.5 px-2 group w-fit', LabelStyle[pallet], className)} data-testid="label">
    <CaptionText className={cnTw('uppercase', LabelTextStyle[pallet])}>{children}</CaptionText>
  </div>
);
