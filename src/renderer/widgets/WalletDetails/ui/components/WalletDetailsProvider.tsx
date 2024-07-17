import { useUnit } from 'effector-react';

import { walletUtils } from '@entities/wallet';

import { walletSelectModel } from '@features/wallets';

import { walletProviderModel } from '../../model/wallet-provider-model';
import { MultishardWalletDetails } from '../wallets/MultishardWalletDetails';
import { MultisigWalletDetails } from '../wallets/MultisigWalletDetails';
import { ProxiedWalletDetails } from '../wallets/ProxiedWalletDetails';
import { SimpleWalletDetails } from '../wallets/SimpleWalletDetails';
import { VaultWalletDetails } from '../wallets/VaultWalletDetails';
import { WalletConnectDetails } from '../wallets/WalletConnectDetails';

export const WalletDetailsProvider = () => {
  const wallet = useUnit(walletSelectModel.$walletForDetails);

  const multiShardAccounts = useUnit(walletProviderModel.$multiShardAccounts);
  const contacts = useUnit(walletProviderModel.$signatoryContacts);
  const vaultAccounts = useUnit(walletProviderModel.$vaultAccounts);
  const signatoryWallets = useUnit(walletProviderModel.$signatoryWallets);
  const signatoryAccounts = useUnit(walletProviderModel.$signatoryAccounts);
  const proxyWallet = useUnit(walletProviderModel.$proxyWallet);

  if (!wallet) {
    return null;
  }

  if (walletUtils.isWatchOnly(wallet) || walletUtils.isSingleShard(wallet)) {
    return <SimpleWalletDetails wallet={wallet} onClose={walletSelectModel.events.walletIdCleared} />;
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

  if (walletUtils.isMultisig(wallet)) {
    return (
      <MultisigWalletDetails
        wallet={wallet}
        signatoryWallets={signatoryWallets}
        signatoryAccounts={signatoryAccounts}
        signatoryContacts={contacts}
        onClose={walletSelectModel.events.walletIdCleared}
      />
    );
  }

  if (walletUtils.isWalletConnect(wallet) || walletUtils.isNovaWallet(wallet)) {
    return <WalletConnectDetails wallet={wallet} onClose={walletSelectModel.events.walletIdCleared} />;
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
        onClose={walletSelectModel.events.walletIdCleared}
      />
    );
  }

  return null;
};
