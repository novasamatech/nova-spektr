import { WalletType } from '@/shared/core';
import { type IconNames } from '@/shared/ui';

export const walletIcon: Record<
  WalletType.POLKADOT_EXTENSION | WalletType.TALISMAN_EXTENSION | WalletType.SUBWALLET_EXTENSION,
  { icon: IconNames; onboarding: IconNames }
> = {
  [WalletType.POLKADOT_EXTENSION]: {
    icon: 'polkadotExtensionBackground',
    onboarding: 'polkadotExtensionOnboarding',
  },
  [WalletType.TALISMAN_EXTENSION]: {
    icon: 'talismanExtensionBackground',
    onboarding: 'talismanExtensionOnboarding',
  },
  [WalletType.SUBWALLET_EXTENSION]: {
    icon: 'subwalletExtensionBackground',
    onboarding: 'subwalletExtensionOnboarding',
  },
};
