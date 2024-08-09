import { type TFunction } from 'react-i18next';

import { useI18n } from '@app/providers';
import { WalletType } from '@shared/core';
import { DropdownButton } from '@shared/ui';
import { type ButtonDropdownOption } from '@shared/ui/types';
import { WalletIcon } from '@entities/wallet';
import { walletPairingModel } from '../model/wallet-pairing-model';

const getDropdownOptions = (t: TFunction): ButtonDropdownOption[] => {
  return [
    {
      id: 'vault',
      title: t('wallets.addPolkadotVault'),
      icon: <WalletIcon type={WalletType.POLKADOT_VAULT} />,
      onClick: () => walletPairingModel.events.walletTypeSet(WalletType.POLKADOT_VAULT),
    },
    {
      id: 'multi',
      title: t('wallets.addMultisig'),
      icon: <WalletIcon type={WalletType.MULTISIG} />,
      onClick: () => walletPairingModel.events.walletTypeSet(WalletType.MULTISIG),
    },
    {
      id: 'novaWallet',
      title: t('wallets.addNovaWallet'),
      icon: <WalletIcon type={WalletType.NOVA_WALLET} />,
      onClick: () => walletPairingModel.events.walletTypeSet(WalletType.NOVA_WALLET),
    },
    {
      id: 'walletConnect',
      title: t('wallets.addWalletConnect'),
      icon: <WalletIcon type={WalletType.WALLET_CONNECT} />,
      onClick: () => walletPairingModel.events.walletTypeSet(WalletType.WALLET_CONNECT),
    },
    {
      id: 'watch-only',
      title: t('wallets.addWatchOnly'),
      icon: <WalletIcon type={WalletType.WATCH_ONLY} />,
      onClick: () => walletPairingModel.events.walletTypeSet(WalletType.WATCH_ONLY),
    },
  ];
};

export const SelectWalletPairing = () => {
  const { t } = useI18n();

  return (
    <DropdownButton
      options={getDropdownOptions(t)}
      className="h-8.5 w-[140px] py-2"
      title={t('wallets.addButtonTitle')}
    />
  );
};
