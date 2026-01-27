import { type PropsWithChildren } from 'react';

import { type Chain } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type IconNames, Icon } from '@/shared/ui';
import { AccountExplorers } from '@/shared/ui-entities';
import { type MultisigEvent } from '@/domains/network';

const IconProps: Record<MultisigEvent['status'], { className: string; name: IconNames }> = {
  approve: { className: 'text-text-positive', name: 'checkmarkOutline' },
  reject: { className: 'text-text-negative', name: 'closeOutline' },
};

type Props = {
  className?: string;
  accountId: AccountId;
  chain?: Chain;
  status: MultisigEvent['status'] | null;
};

export const SignatoryCard = ({ className, accountId, chain, status, children }: PropsWithChildren<Props>) => {
  const statusProps = status ? IconProps[status] : null;

  return (
    <div
      className={cnTw(
        'group flex flex-1 cursor-pointer items-center justify-between gap-x-2 rounded-sm px-2 py-1.5 text-text-secondary',
        'transition-colors hover:bg-action-background-hover hover:text-text-primary',
        className,
      )}
    >
      {children}
      {chain && (
        <div className={cnTw(statusProps && 'opacity-0 transition-opacity group-hover:opacity-100')}>
          <AccountExplorers accountId={accountId} chain={chain} />
        </div>
      )}
      {statusProps && (
        <Icon size={16} className={cnTw('group-hover:hidden', statusProps.className)} name={statusProps.name} />
      )}
    </div>
  );
};
