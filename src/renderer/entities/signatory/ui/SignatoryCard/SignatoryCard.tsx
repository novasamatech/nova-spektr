import { type PropsWithChildren } from 'react';

import { type AccountId, type Explorer, type SigningStatus } from '@shared/core';
import { cnTw } from '@shared/lib/utils';
import { Icon } from '@shared/ui';
import { ExplorersPopover } from '@entities/wallet';

const IconProps = {
  SIGNED: { className: 'group-hover:hidden text-text-positive', name: 'checkmarkOutline' },
  CANCELLED: { className: 'group-hover:hidden text-text-negative', name: 'closeOutline' },
} as const;

type Props = {
  className?: string;
  accountId: AccountId;
  explorers?: Explorer[];
  addressPrefix?: number;
  status?: SigningStatus;
};

export const SignatoryCard = ({
  className,
  accountId,
  explorers,
  addressPrefix,
  status,
  children,
}: PropsWithChildren<Props>) => {
  const button = (
    <div
      className={cnTw(
        'group flex items-center gap-x-2 px-2 py-1.5 cursor-pointer flex-1 text-text-secondary rounded',
        'transition-colors hover:bg-action-background-hover hover:text-text-primary',
        className,
      )}
    >
      {children}
      <Icon name="info" size={16} className="text-icon-hover transition-opacity opacity-0 group-hover:opacity-100" />
      {status && status in IconProps && <Icon size={16} {...IconProps[status as keyof typeof IconProps]} />}
    </div>
  );

  return <ExplorersPopover button={button} address={accountId} explorers={explorers} addressPrefix={addressPrefix} />;
};
