import { type PropsWithChildren } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { CaptionText } from '@/shared/ui';
import { type MultisigEvent } from '@/domains/network';

type StatusConfig = {
  className: string;
  label: string;
};

const StatusProps: Record<MultisigEvent['status'] | 'unsigned', StatusConfig> = {
  approve: { className: 'text-text-positive', label: 'Signed' },
  reject: { className: 'text-text-negative', label: 'Rejected' },
  unsigned: { className: 'text-text-secondary', label: 'Unsigned' },
};

type Props = {
  className?: string;
  status: MultisigEvent['status'] | null;
};

export const SignatoryCard = ({ className, status, children }: PropsWithChildren<Props>) => {
  const statusKey = status ?? 'unsigned';
  const statusConfig = StatusProps[statusKey];

  return (
    <div
      className={cnTw(
        'flex flex-1 items-center justify-between gap-x-2 rounded-sm px-2 py-1.5 text-text-secondary',
        className,
      )}
    >
      {children}
      <div className="flex shrink-0 items-center rounded-[20px] border border-shade-8 px-2.5 py-1">
        <CaptionText align="center" className={cnTw('uppercase', statusConfig.className)}>
          {statusConfig.label}
        </CaptionText>
      </div>
    </div>
  );
};
