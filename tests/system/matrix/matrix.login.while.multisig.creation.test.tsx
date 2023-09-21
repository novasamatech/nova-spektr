import { Page } from 'playwright';

export class LoginPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('https://localhost:3000/');
  }

  async gotoOnboarding() {
    await this.page.goto('https://localhost:3000/#/onboarding');
  }

  async clickWatchOnlyButton() {
    await this.page.click(
      'text=Watch-only Track the activity of any wallet without injecting your private key to Nova Spektr',
    );
  }

  async clickAccountAddressField() {
    await this.page.click('placeholder=Enter or paste your account address');
  }

  async fillAccountAddress(address: string) {
    await this.page.fill('placeholder=Enter or paste your account address', address);
  }

  async clickWalletNameField() {
    await this.page.click('placeholder=Enter a name for your wallet');
  }

  async fillWalletName(name: string) {
    await this.page.fill('placeholder=Enter a name for your wallet', name);
  }

  async clickContinueButton() {
    await this.page.click('text=Continue');
  }

  async clickWatchOnlyAccountButton(accountName: string) {
    await this.page.click(`text=${accountName} Watch-only`);
  }

  async clickAddButton() {
    await this.page.click('text=Add');
  }

  async clickMultisigButton() {
    await this.page.click('text=Multisig');
  }

  async clickUsernameField() {
    await this.page.click('placeholder=Enter username');
  }
}
