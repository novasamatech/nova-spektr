import { useUnit } from 'effector-react';

import { walletSelectModel } from '@renderer/features/wallets';
import { SimpleWalletDetails } from './SimpleWalletDetails';
import { MultisigWalletDetails } from './MultisigWalletDetails';
import { walletProviderModel } from '@renderer/widgets/WalletDetails/model/wallet-provider-model';
import { walletUtils } from '@renderer/entities/wallet';
import type { Wallet } from '@renderer/shared/core';

type ModalProps = {
  wallet: Wallet;
  onClose: () => void;
};
export const WalletDetailsProvider = () => {
  const wallet = useUnit(walletSelectModel.$walletForDetails);
  // const accounts = useUnit(walletProviderModel.$accounts);
  const singleShardAccount = useUnit(walletProviderModel.$singleShardAccount);
  const multisigAccount = useUnit(walletProviderModel.$multisigAccount);
  const contacts = useUnit(walletProviderModel.$signatoryContacts);
  const signatoryWallets = useUnit(walletProviderModel.$signatoryWallets);

  if (!wallet) return null;

  const commonProps: ModalProps = {
    wallet,
    onClose: walletSelectModel.events.walletForDetailsCleared,
  };

  if ((walletUtils.isWatchOnly(wallet) || walletUtils.isSingleShard(wallet)) && singleShardAccount) {
    return <SimpleWalletDetails isOpen account={singleShardAccount} {...commonProps} />;
  }

  if (walletUtils.isMultisig(wallet) && multisigAccount) {
    return (
      <MultisigWalletDetails
        isOpen
        account={multisigAccount}
        signatoryWallets={signatoryWallets}
        signatoryContacts={contacts}
        {...commonProps}
      />
    );
  }

  return <></>;
};
