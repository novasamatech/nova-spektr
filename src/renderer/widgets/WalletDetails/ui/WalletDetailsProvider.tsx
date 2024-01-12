import { useUnit } from 'effector-react';

import { walletSelectModel } from '@features/wallets';
import { SimpleWalletDetails } from './SimpleWalletDetails';
import { MultisigWalletDetails } from './MultisigWalletDetails';
import { WalletConnectDetails } from './WalletConnectDetails';
import { MultishardWalletDetails } from './MultishardWalletDetails';
import { VaultWalletDetails } from './VaultWalletDetails';
import { walletProviderModel } from '../model/wallet-provider-model';
import { walletUtils } from '@entities/wallet';

export const WalletDetailsProvider = () => {
  const wallet = useUnit(walletSelectModel.$walletForDetails);
  const accounts = useUnit(walletProviderModel.$accounts);
  const singleShardAccount = useUnit(walletProviderModel.$singleShardAccount);
  const multiShardAccounts = useUnit(walletProviderModel.$multiShardAccounts);
  const multisigAccount = useUnit(walletProviderModel.$multisigAccount);
  const contacts = useUnit(walletProviderModel.$signatoryContacts);
  const vaultAccounts = useUnit(walletProviderModel.$vaultAccounts);
  const signatoryWallets = useUnit(walletProviderModel.$signatoryWallets);

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

  return null;
};
