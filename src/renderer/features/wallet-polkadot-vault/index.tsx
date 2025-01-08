import { useUnit } from 'effector-react';

import { $features } from '@/shared/config/features';
import { WalletType } from '@/shared/core';
import { createFeature } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { walletGroupSlot } from '@/features/wallet-select';

import { WalletGroup, walletActionsSlot } from './components/WalletGroup';
import { walletsModel } from './model/wallets';

export { walletActionsSlot };

export const walletPolkadotVaultFeature = createFeature({
  name: 'wallet/polkadot vault',
  enable: $features.map(f => f.polkadotVault),
});

walletPolkadotVaultFeature.inject(walletGroupSlot, {
  order: 0,
  render({ query, onSelect }) {
    const { t } = useI18n();
    const wallets = useUnit(walletsModel.$wallets);

    return (
      <WalletGroup
        title={t('wallets.paritySignerLabel')}
        walletType={WalletType.POLKADOT_VAULT}
        wallets={wallets}
        query={query}
        onSelect={onSelect}
      />
    );
  },
});
