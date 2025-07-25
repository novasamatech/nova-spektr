import { type PropsWithChildren, type ReactNode } from 'react';

import { type Wallet, WalletIconType } from '@/shared/core';
import { FootnoteText, HeadlineText } from '@/shared/ui';
import { walletUtils } from '../../lib/wallet-utils';
import { WalletIcon } from '../WalletIcon/WalletIcon';

type Props = PropsWithChildren<{
  wallet: Wallet;
  description?: string | ReactNode;
  additionalInfo?: ReactNode;
  withoutName?: boolean;
}>;

export const WalletCardLg = ({ wallet, description, additionalInfo, children, withoutName }: Props) => {
  const type =
    walletUtils.isFlexibleMultisig(wallet) && !wallet.activated
      ? WalletIconType.FLEXIBLE_MULTISIG_INACTIVE
      : wallet.type;

  return (
    <div className="flex w-full min-w-0 items-center gap-x-2">
      <div className="relative">
        <WalletIcon type={type} size={42} />
        {additionalInfo}
      </div>
      <div className="flex min-w-0 flex-col">
        {!withoutName && (
          <HeadlineText className="ml-3 truncate text-text-primary" as="h3">
            {wallet.name}
          </HeadlineText>
        )}
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
