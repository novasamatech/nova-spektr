import { TEST_IDS } from '@/shared/constants';

import { type BasePageElements } from './BasePageElements';

export class OperationsPageElements implements BasePageElements {
  url = '/#/operations';
  onboardingUrl = '/#/onboarding';
  onboardingLabel = 'Add your wallet';
  walletButton = TEST_IDS.COMMON.WALLET_BUTTON;
  pageTitle = 'Multisig Operations';
  inProgressSection = 'In progress';
}
