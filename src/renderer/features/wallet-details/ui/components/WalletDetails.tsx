import { useGate, useUnit } from 'effector-react';

import { type Wallet } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { walletUtils } from '@/entities/wallet';
import { walletDetailsModel } from '../../model/wallet-details-model';
import { MultishardWalletDetails } from '../wallets/MultishardWalletDetails';
import { MultisigWalletDetails } from '../wallets/MultisigWalletDetails';
import { ProxiedWalletDetails } from '../wallets/ProxiedWalletDetails';
import { SimpleWalletDetails } from '../wallets/SimpleWalletDetails';
import { VaultWalletDetails } from '../wallets/VaultWalletDetails';
import { WalletConnectDetails } from '../wallets/WalletConnectDetails';

type Props = {
  wallet: Wallet | null;
  isOpen: boolean;
  onClose: VoidFunction;
};

export const WalletDetails = ({ isOpen, wallet, onClose }: Props) => {
  useGate(walletDetailsModel.flow, { wallet });

  const multiShardAccounts = useUnit(walletDetailsModel.$multiShardAccounts);
  // TODO move inside MultisigWalletDetails
  const signatories = useUnit(walletDetailsModel.$signatories);

  if (!isOpen || nullable(wallet)) {
    return null;
  }

  if (walletUtils.isWatchOnly(wallet) || walletUtils.isSingleShard(wallet)) {
    return <SimpleWalletDetails wallet={wallet} onClose={onClose} />;
  }

  if (walletUtils.isMultiShard(wallet) && multiShardAccounts.size > 0) {
    return <MultishardWalletDetails wallet={wallet} accounts={multiShardAccounts} onClose={onClose} />;
  }

  // TODO: Separate wallet details for regular and flexible multisig
  if (walletUtils.isMultisig(wallet)) {
    return (
      <MultisigWalletDetails
        wallet={wallet}
        signatoryWallets={signatories.wallets}
        signatoryContacts={signatories.contacts}
        signatoryPeople={signatories.people}
        onClose={onClose}
      />
    );
  }

  if (walletUtils.isWalletConnect(wallet) || walletUtils.isNovaWallet(wallet)) {
    return <WalletConnectDetails wallet={wallet} onClose={onClose} />;
  }

  if (walletUtils.isPolkadotVault(wallet)) {
    return <VaultWalletDetails wallet={wallet} onClose={onClose} />;
  }

  if (walletUtils.isProxied(wallet)) {
    return <ProxiedWalletDetails wallet={wallet} onClose={onClose} />;
  }

  return null;
};
