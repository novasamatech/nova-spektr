import { useUnit } from 'effector-react';

import { $features } from '@/shared/config/features';
import { SigningType, WalletType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { WalletIcon, accountUtils, walletUtils } from '@/entities/wallet';
import { accountSDK } from '@/sdk/account';
import { walletGroupSlot, walletIconSlot } from '@/features/wallet-select';

import { WalletGroup, walletActionsSlot } from './components/WalletGroup';
import { walletsModel } from './model/wallets';

export { walletActionsSlot };

export const polkadotVaultWalletFeature = createFeature({
  name: 'wallet/polkadot vault',
  enable: $features.map(f => f.polkadotVault),
});

accountSDK(polkadotVaultWalletFeature, {
  actionPermission({ account }) {
    return account.signingType === SigningType.POLKADOT_VAULT;
  },
  availableOnChain({ account }) {
    return accountUtils.isVaultChainAccount(account) || accountUtils.isVaultShardAccount(account);
  },
  canSignMultipleTransactions({ account }) {
    return (
      accountUtils.isVaultBaseAccount(account) ||
      accountUtils.isVaultChainAccount(account) ||
      accountUtils.isVaultShardAccount(account)
    );
  },
  collectAccountChildren(children) {
    return children;
  },
  wrapTransaction(transaction) {
    return transaction;
  },
});

polkadotVaultWalletFeature.inject(walletIconSlot, ({ wallet, size }) => {
  if (!walletUtils.isPolkadotVaultGroup(wallet)) return null;

  return <WalletIcon type={wallet.type} size={size} />;
});

polkadotVaultWalletFeature.inject(walletGroupSlot, {
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
