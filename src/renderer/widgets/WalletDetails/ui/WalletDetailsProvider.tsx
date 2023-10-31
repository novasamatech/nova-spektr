import { useUnit } from 'effector-react';

import { walletSelectModel } from '@features/wallets';
import { SimpleWalletDetails } from './SimpleWalletDetails';
import { MultisigWalletDetails } from './MultisigWalletDetails';
import { WalletConnectDetails } from './WalletConnectDetails';
import { walletProviderModel } from '../model/wallet-provider-model';
import { MultishardWalletDetails } from './MultishardWalletDetails';
import { walletUtils } from '@entities/wallet';
import type { Wallet } from '@shared/core';
import { wcDetailsModel } from '../model/wc-details-model';

type ModalProps = {
  wallet: Wallet;
  onClose: () => void;
};
export const WalletDetailsProvider = () => {
  const wallet = useUnit(walletSelectModel.$walletForDetails);
  const accounts = useUnit(walletProviderModel.$accounts);
  const singleShardAccount = useUnit(walletProviderModel.$singleShardAccount);
  const multiShardAccounts = useUnit(walletProviderModel.$multiShardAccounts);
  const multisigAccount = useUnit(walletProviderModel.$multisigAccount);
  const contacts = useUnit(walletProviderModel.$signatoryContacts);
  const isConnected = useUnit(wcDetailsModel.$isConnected);
  const signatoryWallets = useUnit(walletProviderModel.$signatoryWallets);

  if (!wallet) return null;

  const commonProps: ModalProps = {
    wallet,
    onClose: walletSelectModel.events.walletForDetailsCleared,
  };

  if ((walletUtils.isWatchOnly(wallet) || walletUtils.isSingleShard(wallet)) && singleShardAccount) {
    return <SimpleWalletDetails account={singleShardAccount} {...commonProps} />;
  }

  if (walletUtils.isMultiShard(wallet) && multiShardAccounts.size > 0) {
    return <MultishardWalletDetails accounts={multiShardAccounts} {...commonProps} />;
  }

  if (walletUtils.isMultisig(wallet) && multisigAccount) {
    return (
      <MultisigWalletDetails
        account={multisigAccount}
        signatoryWallets={signatoryWallets}
        signatoryContacts={contacts}
        {...commonProps}
      />
    );
  }

  if (walletUtils.isWalletConnect(wallet) || walletUtils.isNovaWallet(wallet)) {
    return <WalletConnectDetails accounts={accounts} isConnected={isConnected} {...commonProps} />;
  }

  return <></>; // HINT: Only Polkadot Vault left
};
