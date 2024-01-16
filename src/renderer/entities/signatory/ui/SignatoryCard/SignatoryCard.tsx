import { PropsWithChildren } from 'react';

import { ExplorersPopover } from '@entities/wallet';
import { Icon, HelpText } from '@shared/ui';
import { SigningStatus } from '@entities/transaction';
import { cnTw } from '@shared/lib/utils';
import type { Explorer, AccountId } from '@shared/core';
import { useI18n } from '@app/providers';

const IconProps = {
  SIGNED: { className: 'group-hover:hidden text-text-positive', name: 'checkmarkOutline' },
  CANCELLED: { className: 'group-hover:hidden text-text-negative', name: 'closeOutline' },
} as const;

type Props = {
  accountId: AccountId;
  explorers?: Explorer[];
  addressPrefix?: number;
  status?: SigningStatus;
  matrixId?: string;
};

export const SignatoryCard = ({
  accountId,
  explorers,
  addressPrefix,
  status,
  matrixId,
  children,
}: PropsWithChildren<Props>) => {
  const { t } = useI18n();

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

  return (
    <ExplorersPopover button={button} address={accountId} explorers={explorers} addressPrefix={addressPrefix}>
      <ExplorersPopover.Group active={Boolean(matrixId)} title={t('general.explorers.matrixIdTitle')}>
        <HelpText className="text-text-secondary break-all">{matrixId}</HelpText>
      </ExplorersPopover.Group>
    </ExplorersPopover>
  );
};
