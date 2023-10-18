import { useUnit } from 'effector-react';

import { WalletType, Wallet, Account } from '@renderer/shared/core';
import { walletSelectModel } from '@renderer/features/wallets';
import { walletProviderModel } from '../model/wallet-provider-model';
import { WalletDetails } from './WalletDetails';

type ModalProps = {
  wallet: Wallet;
  accounts: Account[];
  onClose: () => void;
};
const WalletModals: Record<WalletType, (props: ModalProps) => JSX.Element> = {
  [WalletType.POLKADOT_VAULT]: (props) => <WalletDetails isOpen {...props} />,
  [WalletType.MULTISHARD_PARITY_SIGNER]: (props) => <WalletDetails isOpen {...props} />,
  [WalletType.SINGLE_PARITY_SIGNER]: (props) => <WalletDetails isOpen {...props} />,
  [WalletType.WATCH_ONLY]: (props) => <WalletDetails isOpen {...props} />,
  [WalletType.MULTISIG]: (props) => <WalletDetails isOpen {...props} />,
};

export const WalletDetailsProvider = () => {
  const wallet = useUnit(walletSelectModel.$walletForDetails);
  const accounts = useUnit(walletProviderModel.$accounts);

  if (!wallet) return null;

  const props: ModalProps = {
    wallet,
    accounts,
    onClose: walletSelectModel.events.walletForDetailsCleared,
  };

  return WalletModals[wallet.type](props);
};
