import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { walletSelectModel } from '@features/wallets';
import { SimpleWalletDetails } from './SimpleWalletDetails';
import { MultisigWalletDetails } from './MultisigWalletDetails';
import { WalletConnectDetails } from './WalletConnectDetails';
import { walletProviderModel } from '../model/wallet-provider-model';
import { MultishardWalletDetails } from './MultishardWalletDetails';
import { walletUtils } from '@entities/wallet';
import { proxiesModel } from '@/src/renderer/features/proxies/model/proxies-model';

export const WalletDetailsProvider = () => {
  const wallet = useUnit(walletSelectModel.$walletForDetails);
  const accounts = useUnit(walletProviderModel.$accounts);
  const singleShardAccount = useUnit(walletProviderModel.$singleShardAccount);
  const multiShardAccounts = useUnit(walletProviderModel.$multiShardAccounts);
  const multisigAccount = useUnit(walletProviderModel.$multisigAccount);
  const contacts = useUnit(walletProviderModel.$signatoryContacts);
  const signatoryWallets = useUnit(walletProviderModel.$signatoryWallets);
  // const proxies = useUnit(proxiesModel.$proxies);
  const accountProxies = useUnit(proxiesModel.$accountProxies);

  useEffect(() => {
    console.log('proxies', accountProxies);
  }, [accountProxies]);

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
