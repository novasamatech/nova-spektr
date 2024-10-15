import { type ReactNode } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, Icon } from '@/shared/ui';

type Props = {
  className?: string;
  from: ReactNode;
  to: ReactNode;
  suffix?: ReactNode;
  diff: ReactNode;
  positive?: boolean;
};

export const DiffValue = ({ className, from, to, diff, suffix = null, positive }: Props) => {
  return (
    <div className={cnTw('flex flex-col items-end', className)}>
      <FootnoteText className="flex items-center gap-0.5 text-text-primary">
        <span>{from}</span>
        <Icon name="arrowRight" size={12} className="text-inherit" />
        <span>{to}</span>
        {suffix}
      </FootnoteText>
      <FootnoteText className="flex items-center text-tab-text-accent">
        {positive ? (
          <Icon name="arrowDoubleUp" size={16} className="text-inherit" />
        ) : (
          <Icon name="arrowDoubleDown" size={16} className="text-inherit" />
        )}
        <span>{diff}</span>
      </FootnoteText>
    </div>
  );
};
