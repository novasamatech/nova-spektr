import { TEST_IDS } from '@/shared/constants';

import { type BasePageElements } from './BasePageElements';

export class LoginPageElements implements BasePageElements {
  url = '/#/onboarding';
  enterAccountAddress = TEST_IDS.ONBOARDING.WALLET_ADDRESS_INPUT;
  accountNameField = TEST_IDS.ONBOARDING.WALLET_NAME_INPUT;
  watchOnlyButton = TEST_IDS.ONBOARDING.WATCH_ONLY_BUTTON;
  polkadotVaultButton = TEST_IDS.ONBOARDING.VAULT_BUTTON;
  continueButton = TEST_IDS.COMMON.CONTINUE_BUTTON;
  accessDeniedText = 'text=Access denied!';
  firstInfoButton = TEST_IDS.COMMON.INFO_BUTTON;
  subscanLabel = 'View on Subscan';
  onboardingLabel = 'Add your wallet';
}
