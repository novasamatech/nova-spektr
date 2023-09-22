import { BasePageElements } from './BasePageElements';

export class LoginPageElements implements BasePageElements {
  url = 'https://localhost:3000/#/onboarding';
  enterAccountAddress = 'Enter or paste your account address';
  accountNameField = 'Enter a name for your wallet';
  watchOnlyButton = 'text=Watch-only';
  polkadotVaultButton = 'text=Polkadot Vault';
  continueButton = 'Continue';
  accessDeniedText = 'text=Access denied!';
  firstInfoButton = '[id="headlessui-menu-button-\\:r4\\:"]';
  subscanLabel = 'View on Subscan';
}
