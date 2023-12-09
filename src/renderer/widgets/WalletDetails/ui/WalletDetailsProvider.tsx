import { useEffect } from 'react';
import { useUnit } from 'effector-react';

import { walletSelectModel } from '@features/wallets';
import { SimpleWalletDetails } from './SimpleWalletDetails';
import { MultisigWalletDetails } from './MultisigWalletDetails';
import { WalletConnectDetails } from './WalletConnectDetails';
import { walletProviderModel } from '../model/wallet-provider-model';
import { MultishardWalletDetails } from './MultishardWalletDetails';
import { walletUtils } from '@entities/wallet';
import { proxyModel } from '@entities/proxy';
// TODO: Remove when proxies will be used in UI
import { proxiesModel } from '@features/proxies';

export const WalletDetailsProvider = () => {
  const wallet = useUnit(walletSelectModel.$walletForDetails);
  const accounts = useUnit(walletProviderModel.$accounts);
  const singleShardAccount = useUnit(walletProviderModel.$singleShardAccount);
  const multiShardAccounts = useUnit(walletProviderModel.$multiShardAccounts);
  const multisigAccount = useUnit(walletProviderModel.$multisigAccount);
  const contacts = useUnit(walletProviderModel.$signatoryContacts);
  const signatoryWallets = useUnit(walletProviderModel.$signatoryWallets);
  // TODO: Remove when proxies will be used in UI
  const proxies = useUnit(proxyModel.$proxies);

  useEffect(() => {
    // TODO: Remove when proxies will be used in UI
    console.log('proxies', proxies, proxiesModel);
  }, [proxies]);

  if (!wallet) return null;

  if ((walletUtils.isWatchOnly(wallet) || walletUtils.isSingleShard(wallet)) && singleShardAccount) {
    return (
      <SimpleWalletDetails
        wallet={wallet}
        account={singleShardAccount}
        onClose={walletSelectModel.events.walletForDetailsCleared}
      />
    );
  }

  if (walletUtils.isMultiShard(wallet) && multiShardAccounts.size > 0) {
    return (
      <MultishardWalletDetails
        wallet={wallet}
        accounts={multiShardAccounts}
        onClose={walletSelectModel.events.walletForDetailsCleared}
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
        onClose={walletSelectModel.events.walletForDetailsCleared}
      />
    );
  }

  if (walletUtils.isWalletConnect(wallet) || walletUtils.isNovaWallet(wallet)) {
    return (
      <WalletConnectDetails
        wallet={wallet}
        accounts={accounts}
        onClose={walletSelectModel.events.walletForDetailsCleared}
      />
    );
  }

  return <></>; // HINT: Only Polkadot Vault left
};
