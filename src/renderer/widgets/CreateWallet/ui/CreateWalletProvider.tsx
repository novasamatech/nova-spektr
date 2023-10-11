import { useEffect } from 'react';
import { useUnit } from 'effector-react';
import { useNavigate } from 'react-router-dom';

import { walletProviderModel } from '../model/wallet-provider-model';
import WatchOnly from '@renderer/pages/Onboarding/WatchOnly/WatchOnly';
import Vault from '@renderer/pages/Onboarding/Vault/Vault';
import { MultisigAccount } from './MultisigAccount/MultisigAccount';
import { WalletType } from '@renderer/shared/core';
import { Paths } from '../../../app/providers/routes/paths';

// TODO: Break down WatchOnly / Vault / CreateMultisig to widgets
type ModalProps = {
  onClose: () => void;
  onComplete: () => void;
};
const WalletModals: Record<WalletType, (props: ModalProps) => JSX.Element> = {
  [WalletType.WATCH_ONLY]: (props) => <WatchOnly isOpen {...props} />,
  [WalletType.POLKADOT_VAULT]: (props) => <Vault isOpen {...props} />,
  [WalletType.MULTISHARD_PARITY_SIGNER]: (props) => <Vault isOpen {...props} />,
  [WalletType.SINGLE_PARITY_SIGNER]: (props) => <Vault isOpen {...props} />,
  [WalletType.MULTISIG]: (props) => <MultisigAccount isOpen {...props} />,
};

export const CreateWalletProvider = () => {
  const navigate = useNavigate();
  const walletType = useUnit(walletProviderModel.$walletType);

  useEffect(() => {
    walletProviderModel.events.navigateApiChanged({ navigate, redirectPath: Paths.ASSETS });
  }, []);

  if (!walletType) return null;

  const props: ModalProps = {
    onClose: walletProviderModel.events.modalClosed,
    onComplete: walletProviderModel.events.completed,
  };

  return WalletModals[walletType](props);
};
