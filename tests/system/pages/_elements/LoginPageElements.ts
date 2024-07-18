import { type BasePageElements } from './BasePageElements';

export class LoginPageElements implements BasePageElements {
  url = '/#/onboarding';
  enterAccountAddress = 'Enter or paste your account address';
  accountNameField = 'Enter a name for your wallet';
  watchOnlyButton = 'Watch-only';
  polkadotVaultButton = 'Polkadot Vault';
  continueButton = 'Continue';
  accessDeniedText = 'text=Access denied!';
  firstInfoButton = '[id="headlessui-popover-button-\\:r4\\:"]';
  subscanLabel = 'View on Subscan';
  onboardingLabel = 'Add your wallet';
}
