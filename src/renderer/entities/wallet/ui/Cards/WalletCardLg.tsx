import { ReactNode } from 'react';

import { useI18n } from '@app/providers';
import { FootnoteText, StatusLabel } from '@shared/ui';
import { cnTw } from '@shared/lib/utils';
import type { Wallet } from '@shared/core';
import { WalletIcon } from '../WalletIcon/WalletIcon';
import { walletUtils } from '../../lib/wallet-utils';

type Props = {
  wallet: Wallet;
  description?: string | ReactNode;
  full?: boolean;
  className?: string;
};

export const WalletCardLg = ({ wallet, description, full, className }: Props) => {
  const { t } = useI18n();

  const isWalletConnect = walletUtils.isWalletConnectGroup(wallet);

  return (
    <div className={cnTw('flex items-center gap-x-2 h-10.5', className)}>
      <div className="relative">
        <WalletIcon type={wallet.type} size={32} />
        {isWalletConnect && !full && (
          <span
            className={cnTw(
              'absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 box-content rounded-full border-white border-2',
              wallet.isConnected ? 'bg-icon-positive' : 'bg-icon-default',
            )}
          />
        )}
      </div>
      <div className="flex flex-col">
        <FootnoteText className="text-text-primary">{wallet.name}</FootnoteText>
        {typeof description === 'string' ? (
          <FootnoteText className="text-text-tertiary">{description}</FootnoteText>
        ) : (
          description
        )}
      </div>

      {isWalletConnect && full && (
        <StatusLabel
          className="ml-auto"
          title={wallet.isConnected ? t('wallets.connectedLabel') : t('wallets.disconnectedLabel')}
          variant={wallet.isConnected ? 'success' : 'waiting'}
        />
      )}
    </div>
  );
};
