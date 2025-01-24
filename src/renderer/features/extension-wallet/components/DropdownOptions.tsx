import { useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';
import { Dropdown, Label } from '@/shared/ui-kit';
import { walletIcon } from '../constants';
import { wallets } from '../model/wallets';

import { PairingModal } from './PairingModal';

export const DropdownOptions = () => {
  const { t } = useI18n();
  const polkadotjsExtension = useUnit(wallets.$polkadotJsExtensionWallet);
  const talismanExtension = useUnit(wallets.$talismanExtensionWallet);
  const subWalletExtension = useUnit(wallets.$subWalletExtensionWallet);

  const installed: ReactNode[] = [];
  const notInstalled: ReactNode[] = [];

  const polkadotOption = (
    <PairingModal extension="polkadot-js" title={t('onboarding.extension.polkadotJsTitle')}>
      <Dropdown.Item disabled={nullable(polkadotjsExtension)}>
        <Icon name={walletIcon[WalletType.POLKADOT_EXTENSION].icon} size={20} />
        {t('wallets.addPolkadotExtension')}
        {nonNullable(polkadotjsExtension) && <Label variant="blue">{t('onboarding.extension.beta')}</Label>}
      </Dropdown.Item>
    </PairingModal>
  );

  const talismanOption = (
    <PairingModal extension="talisman" title={t('onboarding.extension.talismanTitle')}>
      <Dropdown.Item disabled={nullable(talismanExtension)}>
        <Icon name={walletIcon[WalletType.TALISMAN_EXTENSION].icon} size={20} />
        {t('wallets.addTalismanExtension')}
        {nonNullable(talismanExtension) && <Label variant="blue">{t('onboarding.extension.beta')}</Label>}
      </Dropdown.Item>
    </PairingModal>
  );

  const subwallet = (
    <PairingModal extension="subwallet-js" title={t('onboarding.extension.subWalletTitle')}>
      <Dropdown.Item disabled={nullable(subWalletExtension)}>
        <Icon name={walletIcon[WalletType.SUBWALLET_EXTENSION].icon} size={20} />
        {t('wallets.addSubWalletExtension')}
        {nonNullable(subWalletExtension) && <Label variant="blue">{t('onboarding.extension.beta')}</Label>}
      </Dropdown.Item>
    </PairingModal>
  );

  if (nonNullable(polkadotjsExtension)) {
    installed.push(polkadotOption);
  } else {
    notInstalled.push(polkadotOption);
  }

  if (nonNullable(talismanExtension)) {
    installed.push(talismanOption);
  } else {
    notInstalled.push(talismanOption);
  }

  if (nonNullable(subWalletExtension)) {
    installed.push(subwallet);
  } else {
    notInstalled.push(subwallet);
  }

  return (
    <>
      {installed}
      {notInstalled.length > 0 && (
        <Dropdown.Group label={t('onboarding.extensionNotInstalled')}>{notInstalled}</Dropdown.Group>
      )}
    </>
  );
};
