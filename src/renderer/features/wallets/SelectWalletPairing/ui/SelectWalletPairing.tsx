import { TFunction } from 'react-i18next';

import { DropdownButton } from '@renderer/shared/ui';
import { ButtonDropdownOption } from '@renderer/shared/ui/Dropdowns/DropdownButton/DropdownButton';
import { useI18n } from '@renderer/app/providers';
import { WalletType } from '@renderer/shared/core';
import { walletPairingModel } from '../model/wallet-pairing-model';

const getDropdownOptions = (t: TFunction): ButtonDropdownOption[] => {
  return [
    {
      id: 'vault',
      title: t('wallets.addPolkadotVault'),
      iconName: 'vault',
      onClick: () => walletPairingModel.events.walletTypeSet(WalletType.POLKADOT_VAULT),
    },
    {
      id: 'multi',
      title: t('wallets.addMultisig'),
      iconName: 'multisig',
      onClick: () => walletPairingModel.events.walletTypeSet(WalletType.MULTISIG),
    },
    {
      id: 'walletConnect',
      title: t('wallets.addWalletConnect'),
      iconName: 'walletConnect',
      onClick: () => walletPairingModel.events.walletTypeSet(WalletType.WALLET_CONNECT),
    },
    {
      id: 'novaWallet',
      title: t('wallets.addNovaWallet'),
      iconName: 'novaWallet',
      onClick: () => walletPairingModel.events.walletTypeSet(WalletType.NOVA_WALLET),
    },
    {
      id: 'watch-only',
      title: t('wallets.addWatchOnly'),
      iconName: 'watchOnly',
      onClick: () => walletPairingModel.events.walletTypeSet(WalletType.WATCH_ONLY),
    },
  ];
};

export const SelectWalletPairing = () => {
  const { t } = useI18n();

  return (
    <DropdownButton
      options={getDropdownOptions(t)}
      className="w-[134px] py-2 h-8.5"
      title={t('wallets.addButtonTitle')}
    />
  );
};
