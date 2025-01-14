import { type PropsWithChildren, type ReactNode } from 'react';

import { type Wallet, WalletIconType } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
import { BodyText, FootnoteText } from '@/shared/ui';
import { walletUtils } from '../../lib/wallet-utils';
import { WalletIcon } from '../WalletIcon/WalletIcon';

type Props = PropsWithChildren<{
  className?: string;
  wallet: Wallet;
  description?: string | ReactNode;
  additionalInfo?: ReactNode;
}>;

export const WalletCardLg = ({ wallet, description, additionalInfo, className, children }: Props) => {
  const type =
    walletUtils.isFlexibleMultisig(wallet) && !wallet.activated
      ? WalletIconType.FLEXIBLE_MULTISIG_INACTIVE
      : wallet.type;

  return (
    <div className={cnTw('flex h-8 w-full min-w-0 items-center gap-x-2', className)}>
      <div className="relative">
        <WalletIcon type={type} size={32} />
        {additionalInfo}
      </div>
      <div className="flex min-w-0 flex-col">
        <BodyText className="truncate text-text-primary">{wallet.name}</BodyText>
        {typeof description === 'string' ? (
          <FootnoteText className="text-text-tertiary">{description}</FootnoteText>
        ) : (
          description
        )}
      </div>

      {children}
    </div>
  );
};
