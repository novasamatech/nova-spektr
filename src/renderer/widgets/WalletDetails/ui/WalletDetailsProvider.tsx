import { useUnit } from 'effector-react';

import { WalletType, Wallet } from '@renderer/shared/core';
import { walletSelectModel } from '@renderer/features/wallets';
import { WalletDetails } from './WalletDetails';

type ModalProps = {
  wallet: Wallet;
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

  if (!wallet) return null;

  const props: ModalProps = {
    wallet,
    onClose: walletSelectModel.events.walletForDetailsCleared,
  };

  return WalletModals[wallet.type](props);
};
