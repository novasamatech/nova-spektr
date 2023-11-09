import { TFunction } from 'react-i18next';

import { DropdownButton } from '@renderer/shared/ui';
import { ButtonDropdownOption } from '@renderer/shared/ui/Dropdowns/DropdownButton/DropdownButton';
import { useI18n } from '@renderer/app/providers';
import { WalletType } from '@renderer/shared/core';
import { WalletIcon } from '@renderer/entities/wallet';
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
      className="w-[140px] py-2 h-8.5"
      title={t('wallets.addButtonTitle')}
    />
  );
};
