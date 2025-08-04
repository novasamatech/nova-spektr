import { useUnit } from 'effector-react';

import { $features } from '@/shared/config/features';
import { WalletType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { isEthereumAccountId, nullable } from '@/shared/lib/utils';
import { WalletAccountIcon } from '@/shared/ui-entities';
import { accountUtils, walletUtils } from '@/entities/wallet';
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
    return (
      accountUtils.isVaultBaseAccount(account) ||
      accountUtils.isVaultChainAccount(account) ||
      accountUtils.isVaultShardAccount(account)
    );
  },
  availableOnChain({ account }) {
    return (
      accountUtils.isVaultBaseAccount(account) ||
      accountUtils.isVaultChainAccount(account) ||
      accountUtils.isVaultShardAccount(account)
    );
  },
  canSignMultipleTransactions({ account }) {
    return (
      accountUtils.isVaultBaseAccount(account) ||
      accountUtils.isVaultChainAccount(account) ||
      accountUtils.isVaultShardAccount(account)
    );
  },
  visualGraphNode({ account }) {
    if (
      accountUtils.isVaultBaseAccount(account) ||
      accountUtils.isVaultChainAccount(account) ||
      accountUtils.isVaultShardAccount(account)
    ) {
      return {
        title: 'Polkadot Vault',
        color: '#EC007D',
      };
    }
  },
});

polkadotVaultWalletFeature.inject(walletIconSlot, ({ wallet, size }) => {
  if (!walletUtils.isPolkadotVaultGroup(wallet)) return null;

  const isSingleAccount = wallet.accounts.length === 1;
  const address = isSingleAccount ? wallet.accounts[0]?.accountId : wallet.rootAccountId;
  if (nullable(address)) return null;
  const isEthereum = isEthereumAccountId(address);
  const theme = isEthereum ? 'ethereum' : isSingleAccount ? 'polkadot' : 'jdenticon';

  return <WalletAccountIcon address={address} type={wallet.type} size={size} theme={theme} />;
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
