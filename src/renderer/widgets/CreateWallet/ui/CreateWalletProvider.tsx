import { useUnit } from 'effector-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { type WalletFamily, WalletType } from '@/shared/core';
import { Paths } from '@/shared/routes';
import { proxiesModel } from '@/features/proxies';
import { walletPairingModel } from '@/features/wallets';
import { Vault } from '@/pages/Onboarding/Vault/Vault';
import { NovaWallet } from '@/pages/Onboarding/WalletConnect/NovaWallet';
import { WalletConnect } from '@/pages/Onboarding/WalletConnect/WalletConnect';
import WatchOnly from '@/pages/Onboarding/WatchOnly/WatchOnly';
import { walletProviderModel } from '../model/wallet-provider-model';

import { SelectMultisigWalletType } from './MultisigWallet/SelectMultisigWalletType';

// TODO: Break down WatchOnly / Vault / CreateMultisig to widgets
type ModalProps = {
  onClose: () => void;
  onComplete: () => void;
};
const WalletModals: Record<WalletFamily, (props: ModalProps) => JSX.Element | null> = {
  [WalletType.POLKADOT_VAULT]: (props) => <Vault isOpen {...props} />,
  [WalletType.WATCH_ONLY]: (props) => <WatchOnly isOpen {...props} />,
  [WalletType.MULTISIG]: (props) => <SelectMultisigWalletType isOpen {...props} />,
  [WalletType.WALLET_CONNECT]: (props) => <WalletConnect isOpen {...props} />,
  [WalletType.NOVA_WALLET]: (props) => <NovaWallet isOpen {...props} />,
  [WalletType.FLEXIBLE_MULTISIG]: () => null,
  [WalletType.PROXIED]: () => null,
};

export const CreateWalletProvider = () => {
  const navigate = useNavigate();
  const walletType = useUnit(walletPairingModel.$walletType);

  useEffect(() => {
    walletProviderModel.events.navigateApiChanged({ navigate, redirectPath: Paths.ASSETS });
  }, []);

  if (!walletType) {
    return null;
  }

  const props: ModalProps = {
    onClose: walletPairingModel.events.walletTypeCleared,
    onComplete: () => {
      if (walletType !== WalletType.WATCH_ONLY) {
        setTimeout(() => {
          proxiesModel.events.workerStarted();
        }, 1000);
      }
      walletProviderModel.events.completed();
    },
  };

  return WalletModals[walletType](props);
};
