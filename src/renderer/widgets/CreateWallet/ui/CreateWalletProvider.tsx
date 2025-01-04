import { useUnit } from 'effector-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { type WalletFamily, WalletType } from '@/shared/core';
import { Paths } from '@/shared/routes';
import { proxiesModel } from '@/features/proxies';
import { walletPairingModel } from '@/features/wallet-pairing';
import { walletProviderModel } from '../model/wallet-provider-model';

import { SelectMultisigWalletType } from './MultisigWallet/SelectMultisigWalletType';

// TODO: Break down WatchOnly / Vault / CreateMultisig to widgets
type ModalProps = {
  onClose: () => void;
  onComplete: () => void;
};
const WalletModals: Record<WalletFamily, (props: ModalProps) => JSX.Element | null> = {
  // moved to features/wallet-pairing-polkadot-vault
  [WalletType.POLKADOT_VAULT]: () => null,
  // moved to features/wallet-pairing-watch-only
  [WalletType.WATCH_ONLY]: () => null,
  [WalletType.MULTISIG]: (props) => <SelectMultisigWalletType isOpen {...props} />,
  // moved to features/wallet-pairing-wallet-connect
  [WalletType.WALLET_CONNECT]: () => null,
  // moved to features/wallet-pairing-wallet-connect
  [WalletType.NOVA_WALLET]: () => null,
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
