import { useUnit } from 'effector-react';

import { TEST_IDS } from '@/shared/constants';
import { WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';
import { WalletOnboardingCard } from '@/shared/ui-entities';
import { Dropdown, Label } from '@/shared/ui-kit';
import { accountsService } from '@/domains/network';
import { walletPairingDropdownOptionsSlot } from '@/features/wallet-pairing';
import { walletGroupSlot, walletIconSlot } from '@/features/wallet-select';
import { onboardingActionsSlot } from '@/pages/Onboarding';

import { PairingModal } from './components/PairingModal';
import { WalletGroup, walletActionsSlot } from './components/WalletGroup';
import { walletIcon } from './constants';
import { extensionWalletFeature } from './model/feature';
import { wallets } from './model/wallets';
import { polkadotExtensionService } from './service';
import { type PolkadotExtensionWallet, type SubWalletExtensionWallet, type TalismanExtensionWallet } from './types';

export { extensionWalletFeature, walletActionsSlot, polkadotExtensionService };
export type { PolkadotExtensionWallet, TalismanExtensionWallet, SubWalletExtensionWallet };

extensionWalletFeature.inject(accountsService.accountAvailabilityOnChainAnyOf, ({ account }) => {
  return polkadotExtensionService.isExtensionAccount(account);
});

extensionWalletFeature.inject(accountsService.accountActionPermissionAnyOf, ({ account }) => {
  return polkadotExtensionService.isExtensionAccount(account);
});

extensionWalletFeature.inject(walletIconSlot, ({ wallet, size }) => {
  if (!polkadotExtensionService.isExtensionWallet(wallet)) return null;

  return <Icon name={walletIcon[wallet.type].icon} size={size} />;
});

extensionWalletFeature.inject(walletPairingDropdownOptionsSlot, {
  order: 3,
  render({ t }) {
    const polkadotjsExtension = useUnit(wallets.$polkadotJsExtensionWallet);
    const talismanExtension = useUnit(wallets.$talismanExtensionWallet);
    const subWalletExtension = useUnit(wallets.$subWalletExtensionWallet);

    return (
      <>
        <PairingModal extension="polkadot-js" title={t('onboarding.extension.polkadotJsTitle')}>
          <Dropdown.Item disabled={nullable(polkadotjsExtension)}>
            <Icon name={walletIcon[WalletType.POLKADOT_EXTENSION].icon} size={20} />
            {t('wallets.addPolkadotExtension')}
            <Label variant="blue">{t('onboarding.extension.beta')}</Label>
          </Dropdown.Item>
        </PairingModal>
        <PairingModal extension="talisman" title={t('onboarding.extension.talismanTitle')}>
          <Dropdown.Item disabled={nullable(talismanExtension)}>
            <Icon name={walletIcon[WalletType.TALISMAN_EXTENSION].icon} size={20} />
            {t('wallets.addTalismanExtension')}
            <Label variant="blue">{t('onboarding.extension.beta')}</Label>
          </Dropdown.Item>
        </PairingModal>
        <PairingModal extension="subwallet-js" title={t('onboarding.extension.subWalletTitle')}>
          <Dropdown.Item disabled={nullable(subWalletExtension)}>
            <Icon name={walletIcon[WalletType.SUBWALLET_EXTENSION].icon} size={20} />
            {t('wallets.addSubWalletExtension')}
            <Label variant={nullable(subWalletExtension) ? 'darkGray' : 'blue'}>{t('onboarding.extension.beta')}</Label>
          </Dropdown.Item>
        </PairingModal>
      </>
    );
  },
});

extensionWalletFeature.inject(onboardingActionsSlot, {
  order: 5,
  render() {
    const { t } = useI18n();
    const polkadotjsExtension = useUnit(wallets.$polkadotJsExtensionWallet);
    const talismanExtension = useUnit(wallets.$talismanExtensionWallet);
    const subWalletExtension = useUnit(wallets.$subWalletExtensionWallet);

    return (
      <>
        <PairingModal extension="polkadot-js" title={t('onboarding.extension.polkadotJsTitle')}>
          <WalletOnboardingCard
            beta
            disabled={nullable(polkadotjsExtension)}
            title={t('onboarding.welcome.polkadotExtensionTitle')}
            description={t('onboarding.welcome.polkadotExtensionDescription')}
            iconName={walletIcon[WalletType.POLKADOT_EXTENSION].onboarding}
            testId={TEST_IDS.ONBOARDING.POLKADOT_EXTENSION_BUTTON}
          />
        </PairingModal>
        <PairingModal extension="talisman" title={t('onboarding.extension.talismanTitle')}>
          <WalletOnboardingCard
            beta
            disabled={nullable(talismanExtension)}
            title={t('onboarding.welcome.talismanTitle')}
            description={t('onboarding.welcome.talismanDescription')}
            iconName={walletIcon[WalletType.TALISMAN_EXTENSION].onboarding}
            testId={TEST_IDS.ONBOARDING.TALISMAN_BUTTON}
          />
        </PairingModal>
        <PairingModal extension="subwallet-js" title={t('onboarding.extension.subWalletTitle')}>
          <WalletOnboardingCard
            beta
            disabled={nullable(subWalletExtension)}
            title={t('onboarding.welcome.subWalletTitle')}
            description={t('onboarding.welcome.subWalletDescription')}
            iconName={walletIcon[WalletType.SUBWALLET_EXTENSION].onboarding}
            testId={TEST_IDS.ONBOARDING.SUBWALLET_BUTTON}
          />
        </PairingModal>
      </>
    );
  },
});

extensionWalletFeature.inject(walletGroupSlot, {
  order: 0,
  render({ query, onSelect }) {
    const { t } = useI18n();
    const polkadot = useUnit(wallets.$polkadot);
    const talisman = useUnit(wallets.$talisman);
    const subWallet = useUnit(wallets.$subWallet);

    return (
      <>
        <WalletGroup
          title={t('wallets.polkadotExtensionLabel')}
          icon={walletIcon[WalletType.POLKADOT_EXTENSION].icon}
          wallets={polkadot}
          query={query}
          onSelect={onSelect}
        />
        <WalletGroup
          title={t('wallets.talismanExtensionLabel')}
          icon={walletIcon[WalletType.TALISMAN_EXTENSION].icon}
          wallets={talisman}
          query={query}
          onSelect={onSelect}
        />
        <WalletGroup
          title={t('wallets.subWalletExtensionLabel')}
          icon={walletIcon[WalletType.SUBWALLET_EXTENSION].icon}
          wallets={subWallet}
          query={query}
          onSelect={onSelect}
        />
      </>
    );
  },
});
