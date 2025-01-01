import { TEST_IDS } from '@/shared/constants';
import { WalletType } from '@/shared/core';
import { createFeature } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { WalletCard } from '@/shared/ui-entities';
import { walletPairingDropdownOptionsPipeline, walletPairingModel } from '@/features/wallet-pairing';
import { onboardingActionsSlot } from '@/pages/Onboarding';

// TODO this component should be injected, not exported
export { WalletConnectQrCode } from './components/WalletConnectQrCode';

// TODO implement

export const walletPairingWalletConnectFeature = createFeature({
  name: 'wallet pairing/wallet connect',
});

walletPairingWalletConnectFeature.inject(onboardingActionsSlot, {
  order: 1,
  render() {
    const { t } = useI18n();

    // nova wallet pairing is basically the same, let's keep it here for now
    return (
      <>
        <WalletCard
          title={t('onboarding.welcome.novaWalletTitle')}
          description={t('onboarding.welcome.novaWalletDescription')}
          iconName="novaWalletOnboarding"
          testId={TEST_IDS.ONBOARDING.NOVA_WALLET_BUTTON}
          onClick={() => walletPairingModel.events.walletTypeSet(WalletType.NOVA_WALLET)}
        />

        <WalletCard
          title={t('onboarding.welcome.walletConnectTitle')}
          description={t('onboarding.welcome.walletConnectDescription')}
          iconName="walletConnectOnboarding"
          testId={TEST_IDS.ONBOARDING.WALLET_CONNECT_BUTTON}
          onClick={() => walletPairingModel.events.walletTypeSet(WalletType.WALLET_CONNECT)}
        />
      </>
    );
  },
});

walletPairingWalletConnectFeature.inject(walletPairingDropdownOptionsPipeline, (options, { t }) => {
  return options.concat([
    // nova wallet pairing is basically the same, let's keep it here for now
    { title: t('wallets.addNovaWallet'), walletType: WalletType.NOVA_WALLET, order: 2 },
    { title: t('wallets.addWalletConnect'), walletType: WalletType.WALLET_CONNECT, order: 3 },
  ]);
});
