import { useUnit } from 'effector-react';

import { walletSelectModel } from '@features/wallets';
import { SimpleWalletDetails } from '../wallets/SimpleWalletDetails';
import { MultisigWalletDetails } from '../wallets/MultisigWalletDetails';
import { WalletConnectDetails } from '../wallets/WalletConnectDetails';
import { MultishardWalletDetails } from '../wallets/MultishardWalletDetails';
import { VaultWalletDetails } from '../wallets/VaultWalletDetails';
import { walletProviderModel } from '../../model/wallet-provider-model';
import { walletUtils } from '@entities/wallet';
import { ProxiedWalletDetails } from '../wallets/ProxiedWalletDetails';
import { ProxiedAccount } from '@shared/core';

export const WalletDetailsProvider = () => {
  const wallet = useUnit(walletSelectModel.$walletForDetails);
  const accounts = useUnit(walletProviderModel.$accounts);
  const singleShardAccount = useUnit(walletProviderModel.$singleShardAccount);
  const multiShardAccounts = useUnit(walletProviderModel.$multiShardAccounts);
  const multisigAccount = useUnit(walletProviderModel.$multisigAccount);
  const contacts = useUnit(walletProviderModel.$signatoryContacts);
  const vaultAccounts = useUnit(walletProviderModel.$vaultAccounts);
  const signatoryWallets = useUnit(walletProviderModel.$signatoryWallets);
  const signatoryAccounts = useUnit(walletProviderModel.$signatoryAccounts);
  const proxyWallet = useUnit(walletProviderModel.$proxyWallet);

  if (!wallet) return null;

  if ((walletUtils.isWatchOnly(wallet) || walletUtils.isSingleShard(wallet)) && singleShardAccount) {
    return (
      <SimpleWalletDetails
        wallet={wallet}
        account={singleShardAccount}
        onClose={walletSelectModel.events.walletIdCleared}
      />
    );
  }

  if (walletUtils.isMultiShard(wallet) && multiShardAccounts.size > 0) {
    return (
      <MultishardWalletDetails
        wallet={wallet}
        accounts={multiShardAccounts}
        onClose={walletSelectModel.events.walletIdCleared}
      />
    );
  }

  if (walletUtils.isMultisig(wallet) && multisigAccount) {
    return (
      <MultisigWalletDetails
        wallet={wallet}
        account={multisigAccount}
        signatoryWallets={signatoryWallets}
        signatoryAccounts={signatoryAccounts}
        signatoryContacts={contacts}
        onClose={walletSelectModel.events.walletIdCleared}
      />
    );
  }

  if (walletUtils.isWalletConnect(wallet) || walletUtils.isNovaWallet(wallet)) {
    return (
      <WalletConnectDetails wallet={wallet} accounts={accounts} onClose={walletSelectModel.events.walletIdCleared} />
    );
  }

  if (walletUtils.isPolkadotVault(wallet) && vaultAccounts) {
    return (
      <VaultWalletDetails
        wallet={wallet}
        root={vaultAccounts.root}
        accountsMap={vaultAccounts.accountsMap}
        onClose={walletSelectModel.events.walletIdCleared}
      />
    );
  }

  if (walletUtils.isProxied(wallet) && proxyWallet) {
    return (
      <ProxiedWalletDetails
        wallet={wallet}
        proxyWallet={proxyWallet}
        proxiedAccount={accounts[0] as ProxiedAccount}
        onClose={walletSelectModel.events.walletIdCleared}
      />
    );
  }

  return null;
};
