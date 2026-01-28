import { type PropsWithChildren } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { type IconNames, BodyText, Icon } from '@/shared/ui';

type Props = {
  title: string;
  icon?: IconNames;
  className?: string;
};

export const TransactionTitle = ({ title, icon, className, children }: PropsWithChildren<Props>) => {
  return (
    <div className={cnTw('inline-flex items-center gap-x-3', className)}>
      {icon && (
        <div className="box-content flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-token-container-border">
          <Icon name={icon} size={20} />
        </div>
      )}
      <div className="flex flex-col justify-center gap-y-0.5 overflow-hidden">
        <div className="flex items-center gap-x-1">
          <BodyText className={cnTw('whitespace-nowrap', !children && 'truncate')}>{title}</BodyText>
          {children}
        </div>
      </div>
    </div>
  );
};
