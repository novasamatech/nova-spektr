import { type PropsWithChildren } from 'react';

import { type Variant } from './common/types';
import { BadgeStyles } from './common/constants';
import { CaptionText } from '@shared/ui';
import { cnTw } from '@shared/lib/utils';

type Props = {
  variant: Variant;
  className?: string;
};

export const Counter = ({ variant, className, children }: PropsWithChildren<Props>) => (
  <div className={cnTw('flex items-center justify-center rounded-[30px] px-1.5 h-4', BadgeStyles[variant], className)}>
    {['string', 'number'].includes(typeof children) ? (
      <CaptionText className="text-white">{children}</CaptionText>
    ) : (
      children
    )}
  </div>
);
