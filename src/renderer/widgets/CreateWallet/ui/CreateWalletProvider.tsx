import { useEffect } from 'react';
import { useUnit } from 'effector-react';
import { useNavigate } from 'react-router-dom';

import WatchOnly from '@renderer/pages/Onboarding/WatchOnly/WatchOnly';
import Vault from '@renderer/pages/Onboarding/Vault/Vault';
import { MultisigAccount } from './MultisigAccount/MultisigAccount';
import { WalletType, WalletFamily } from '@renderer/shared/core';
import { walletPairingModel } from '@renderer/features/wallets';
import { Paths } from '@renderer/shared/routes';
import { walletProviderModel } from '../model/wallet-provider-model';

// TODO: Break down WatchOnly / Vault / CreateMultisig to widgets
type ModalProps = {
  onClose: () => void;
  onComplete: () => void;
};
const WalletModals: Record<WalletFamily, (props: ModalProps) => JSX.Element> = {
  [WalletType.WATCH_ONLY]: (props) => <WatchOnly isOpen {...props} />,
  [WalletType.POLKADOT_VAULT]: (props) => <Vault isOpen {...props} />,
  [WalletType.MULTISIG]: (props) => <MultisigAccount isOpen {...props} />,
};

export const CreateWalletProvider = () => {
  const navigate = useNavigate();
  const walletType = useUnit(walletPairingModel.$walletType);

  useEffect(() => {
    walletProviderModel.events.navigateApiChanged({ navigate, redirectPath: Paths.ASSETS });
  }, []);

  if (!walletType) return null;

  const props: ModalProps = {
    onClose: walletPairingModel.events.clearWalletType,
    onComplete: walletProviderModel.events.completed,
  };

  return WalletModals[walletType](props);
};
