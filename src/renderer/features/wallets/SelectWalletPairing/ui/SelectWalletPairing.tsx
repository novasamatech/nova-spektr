import { type TFunction } from 'i18next';

import { type WalletFamily, WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { Button, Icon } from '@/shared/ui';
import { Dropdown } from '@/shared/ui-kit';
import { WalletIcon } from '@/entities/wallet';
import { walletPairingModel } from '../model/wallet-pairing-model';

const getDropdownOptions = (t: TFunction): { title: string; walletType: WalletFamily }[] => {
  return [
    { title: t('wallets.addPolkadotVault'), walletType: WalletType.POLKADOT_VAULT },
    { title: t('wallets.addMultisig'), walletType: WalletType.MULTISIG },
    { title: t('wallets.addNovaWallet'), walletType: WalletType.NOVA_WALLET },
    { title: t('wallets.addWalletConnect'), walletType: WalletType.WALLET_CONNECT },
    { title: t('wallets.addWatchOnly'), walletType: WalletType.WATCH_ONLY },
  ];
};

export const SelectWalletPairing = () => {
  const { t } = useI18n();

  const [isOpen, toggleIsOpen] = useToggle();

  return (
    <Dropdown open={isOpen} onToggle={toggleIsOpen}>
      <Dropdown.Trigger>
        <Button
          className="h-8.5 w-full justify-center py-2"
          suffixElement={<Icon name={isOpen ? 'up' : 'down'} size={16} className="text-inherit" />}
        >
          {t('wallets.addButtonTitle')}
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Content>
        {getDropdownOptions(t).map(({ title, walletType }) => (
          <Dropdown.Item key={title} onSelect={() => walletPairingModel.events.walletTypeSet(walletType)}>
            <div className="flex items-center gap-2">
              <WalletIcon type={walletType} />
              {title}
            </div>
          </Dropdown.Item>
        ))}
      </Dropdown.Content>
    </Dropdown>
  );
};
