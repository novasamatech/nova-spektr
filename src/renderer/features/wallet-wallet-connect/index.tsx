import { useUnit } from 'effector-react';

import { WalletType } from '@/shared/core';
import { createFeature } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { walletGroupSlot } from '@/features/wallet-select';

import { WalletGroup } from './components/WalletGroup';
import { walletsModel } from './model/wallets';

// TODO implement

export const walletWalletConnectFeature = createFeature({
  name: 'wallet/wallet connect',
});

walletWalletConnectFeature.inject(walletGroupSlot, ({ query, onSelect, onDetailsRequest }) => {
  const { t } = useI18n();
  const nova = useUnit(walletsModel.$novaWallets);
  const wc = useUnit(walletsModel.$walletConnectWallets);

  return (
    <>
      <WalletGroup
        title={t('wallets.novaWalletLabel')}
        walletType={WalletType.NOVA_WALLET}
        wallets={nova}
        query={query}
        onSelect={onSelect}
        onDetailsRequest={onDetailsRequest}
      />
      <WalletGroup
        title={t('wallets.walletConnectLabel')}
        walletType={WalletType.WALLET_CONNECT}
        wallets={wc}
        query={query}
        onSelect={onSelect}
        onDetailsRequest={onDetailsRequest}
      />
    </>
  );
});
