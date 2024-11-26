import { type PropsWithChildren } from 'react';

import { type AccountId, type Explorer, type SigningStatus } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
import { Icon, type IconNames } from '@/shared/ui';
import { ExplorersPopover } from '@/entities/wallet';

const IconProps: Record<SigningStatus, { className: string; name: IconNames }> = {
  SIGNED: { className: 'text-text-positive', name: 'checkmarkOutline' },
  CANCELLED: { className: 'text-text-negative', name: 'closeOutline' },
  ERROR_SIGNED: { className: 'text-text-negative', name: 'checkmarkOutline' },
  ERROR_CANCELLED: { className: 'text-text-negative', name: 'closeOutline' },
  PENDING_CANCELLED: { className: 'text-text-warning', name: 'closeOutline' },
  PENDING_SIGNED: { className: 'text-text-warning', name: 'checkmarkOutline' },
};

type Props = {
  className?: string;
  accountId: AccountId;
  explorers?: Explorer[];
  addressPrefix?: number;
  status?: SigningStatus | null;
};

export const SignatoryCard = ({
  className,
  accountId,
  explorers,
  addressPrefix,
  status,
  children,
}: PropsWithChildren<Props>) => {
  const statusProps = status ? IconProps[status] : null;

  const button = (
    <div
      className={cnTw(
        'group flex flex-1 cursor-pointer items-center justify-between gap-x-2 rounded px-2 py-1.5 text-text-secondary',
        'transition-colors hover:bg-action-background-hover hover:text-text-primary',
        className,
      )}
    >
      {children}
      <Icon name="details" size={16} className="text-icon-hover opacity-0 transition-opacity group-hover:opacity-100" />
      {statusProps ? (
        <Icon size={16} className={cnTw('group-hover:hidden', statusProps.className)} name={statusProps.name} />
      ) : null}
    </div>
  );

  return <ExplorersPopover button={button} address={accountId} explorers={explorers} addressPrefix={addressPrefix} />;
};
