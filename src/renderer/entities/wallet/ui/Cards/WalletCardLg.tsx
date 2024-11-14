import { type ReactNode } from 'react';

import { type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { BodyText, FootnoteText, StatusLabel } from '@/shared/ui';
import { walletUtils } from '../../lib/wallet-utils';
import { WalletIcon } from '../WalletIcon/WalletIcon';

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
    <div className={cnTw('flex h-8 w-full min-w-0 items-center gap-x-2', className)}>
      <div className="relative">
        <WalletIcon type={wallet.type} size={32} />
        {isWalletConnect && !full && (
          <span
            className={cnTw(
              'absolute -bottom-0.5 -right-0.5 box-content h-1.5 w-1.5 rounded-full border-2 border-white',
              wallet.isConnected ? 'bg-icon-positive' : 'bg-icon-default',
            )}
          />
        )}
      </div>
      <div className="flex min-w-0 flex-col">
        <BodyText className="truncate text-text-primary">{wallet.name}</BodyText>
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
