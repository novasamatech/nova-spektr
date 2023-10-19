import { useUnit } from 'effector-react';

import { WalletType, Wallet, Account } from '@renderer/shared/core';
import { walletSelectModel } from '@renderer/features/wallets';
import { walletProviderModel } from '../model/wallet-provider-model';
import { SimpleWalletDetails } from './SimpleWalletDetails';
import { WalletConnectDetails } from './WalletConnectDetails';

type ModalProps = {
  wallet: Wallet;
  accounts: Account[];
  onClose: () => void;
};
const WalletModals: Record<WalletType, (props: ModalProps) => JSX.Element> = {
  [WalletType.POLKADOT_VAULT]: (props) => <></>,
  [WalletType.MULTISHARD_PARITY_SIGNER]: (props) => <></>,
  [WalletType.SINGLE_PARITY_SIGNER]: ({ accounts, ...rest }: ModalProps) => (
    <SimpleWalletDetails isOpen account={accounts[0]} {...rest} />
  ),
  [WalletType.WATCH_ONLY]: ({ accounts, ...rest }: ModalProps) => (
    <SimpleWalletDetails isOpen account={accounts[0]} {...rest} />
  ),
  [WalletType.MULTISIG]: (props) => <></>,
  [WalletType.NOVA_WALLET]: (props) => <WalletConnectDetails isOpen {...props} />,
  [WalletType.WALLET_CONNECT]: (props) => <WalletConnectDetails isOpen {...props} />,
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
