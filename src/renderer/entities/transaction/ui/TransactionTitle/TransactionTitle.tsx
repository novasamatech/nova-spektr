import { type PropsWithChildren } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { BodyText, Icon, type IconNames } from '@/shared/ui';

type Props = {
  title: string;
  icon?: IconNames;
  className?: string;
};

export const TransactionTitle = ({ title, icon, className, children }: PropsWithChildren<Props>) => {
  return (
    <div className={cnTw('inline-flex items-center gap-x-3', className)}>
      {icon && (
        <div className="border-token-container-border box-content flex h-7 w-7 shrink-0 items-center justify-center rounded-full border">
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
