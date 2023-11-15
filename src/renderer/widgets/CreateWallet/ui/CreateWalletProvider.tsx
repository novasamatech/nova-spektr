import { useEffect } from 'react';
import { useUnit } from 'effector-react';
import { useNavigate } from 'react-router-dom';

import WatchOnly from '@pages/Onboarding/WatchOnly/WatchOnly';
import Vault from '@pages/Onboarding/Vault/Vault';
import { NovaWallet } from '@pages/Onboarding/WalletConnect/NovaWallet';
import { WalletConnect } from '@pages/Onboarding/WalletConnect/WalletConnect';
import { MultisigAccount } from './MultisigAccount/MultisigAccount';
import { WalletType, WalletFamily } from '@shared/core';
import { walletPairingModel } from '@features/wallets';
import { Paths } from '@shared/routes';
import { walletProviderModel } from '../model/wallet-provider-model';

// TODO: Break down WatchOnly / Vault / CreateMultisig to widgets
type ModalProps = {
  onClose: () => void;
  onComplete: () => void;
};
const WalletModals: Record<WalletFamily, (props: ModalProps) => JSX.Element> = {
  [WalletType.POLKADOT_VAULT]: (props) => <Vault isOpen {...props} />,
  [WalletType.WATCH_ONLY]: (props) => <WatchOnly isOpen {...props} />,
  [WalletType.MULTISIG]: (props) => <MultisigAccount isOpen {...props} />,
  [WalletType.WALLET_CONNECT]: (props) => <WalletConnect isOpen {...props} />,
  [WalletType.NOVA_WALLET]: (props) => <NovaWallet isOpen {...props} />,
};

export const CreateWalletProvider = () => {
  const navigate = useNavigate();
  const walletType = useUnit(walletPairingModel.$walletType);

  useEffect(() => {
    walletProviderModel.events.navigateApiChanged({ navigate, redirectPath: Paths.ASSETS });
  }, []);

  if (!walletType) return null;

  const props: ModalProps = {
    onClose: walletPairingModel.events.walletTypeCleared,
    onComplete: walletProviderModel.events.completed,
  };

  return WalletModals[walletType](props);
};
