import { type IconNames } from '@/shared/ui';

import { type ExtensionType } from './types';

export const walletIcon: Record<ExtensionType, { icon: IconNames; onboarding: IconNames }> = {
  'polkadot-js': {
    icon: 'polkadotExtensionBackground',
    onboarding: 'polkadotExtensionOnboarding',
  },
};
