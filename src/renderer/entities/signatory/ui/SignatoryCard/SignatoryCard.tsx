import { PropsWithChildren } from 'react';

import { ExplorersPopover } from '@entities/wallet';
import { Icon } from '@shared/ui';
import { cnTw } from '@shared/lib/utils';
import type { Explorer, AccountId, SigningStatus } from '@shared/core';

const IconProps = {
  SIGNED: { className: 'group-hover:hidden text-text-positive', name: 'checkmarkOutline' },
  CANCELLED: { className: 'group-hover:hidden text-text-negative', name: 'closeOutline' },
} as const;

type Props = {
  accountId: AccountId;
  explorers?: Explorer[];
  addressPrefix?: number;
  status?: SigningStatus;
};

export const SignatoryCard = ({ accountId, explorers, addressPrefix, status, children }: PropsWithChildren<Props>) => {
  const button = (
    <div
      className={cnTw(
        'group flex items-center gap-x-2 px-2 py-1.5 cursor-pointer flex-1 text-text-secondary rounded',
        'transition-colors hover:bg-action-background-hover hover:text-text-primary',
      )}
    >
      {children}
      <Icon name="info" size={16} className="text-icon-hover invisible group-hover:visible" />
      {status && status in IconProps && <Icon size={16} {...IconProps[status as keyof typeof IconProps]} />}
    </div>
  );

  return <ExplorersPopover button={button} address={accountId} explorers={explorers} addressPrefix={addressPrefix} />;
};
