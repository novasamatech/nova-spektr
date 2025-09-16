import { type Page } from '@playwright/test';
import { step } from 'allure-js-commons';

import { TEST_IDS } from '@/shared/constants';
import { BaseModal } from '../BaseModalWindow';
import { type BasePage } from '../BasePage';
import { MultisigModalElements } from '../_elements/MultisigModalElements';
import { type WalletModalElements } from '../_elements/WalletModalElements';

import { MultisigModalWindow } from './MultisigModalWindow';

export class WalletModalWindow extends BaseModal<WalletModalElements> {
  public previousPage: BasePage;

  constructor(page: Page, pageElements: WalletModalElements, previousPage: BasePage) {
    super(page, pageElements);
    this.previousPage = previousPage;
  }

  public async openWalletModalWindow(): Promise<WalletModalWindow> {
    await step('Open wallet modal window', async () => {
      await this.previousPage.click(this.previousPage.pageElements.url);
    });

    return this;
  }

  public async openMultisigCreationModalWindow(): Promise<MultisigModalWindow> {
    await step('Open Multisig creation widget', async () => {
      await this.page.getByTestId(TEST_IDS.ADD_BUTTON).click();
      await this.page.getByRole('menuitem', { name: 'Multisig' }).click();
    });

    return new MultisigModalWindow(this.page, new MultisigModalElements(), this.previousPage);
  }

  public async searchWallet(walletname: string): Promise<WalletModalWindow> {
    return await step(`Search wallet ${walletname} in wallets list`, async () => {
      await this.page.getByTestId(TEST_IDS.WALLET_MANAGEMENT.WALLET_SEARCH).fill(walletname);

      return this;
    });
  }

  public async selectWallet(walletname: string): Promise<WalletModalWindow> {
    return await step(`Select wallet ${walletname} from the wallets list`, async () => {
      await this.page
        .getByTestId(TEST_IDS.WALLET_MANAGEMENT.WALLET_ITEM)
        .filter({ hasText: walletname })
        .first()
        .click();

      return this;
    });
  }

  public async closeWalletManagement(): Promise<BasePage> {
    return await step('Close Wallet Management modal', async () => {
      await this.page.getByTestId(TEST_IDS.COMMON.WALLET_BUTTON).click({ force: true });

      await this.page
        .getByTestId(TEST_IDS.WALLET_MANAGEMENT.WALLET_SEARCH)
        .waitFor({ state: 'hidden' })
        .catch(() => {});

      return this.previousPage;
    });
  }

  public async searchAndSelectWallet(walletname: string): Promise<BasePage> {
    return await step(`Search and select wallet ${walletname} in the list of wallets`, async () => {
      await this.searchWallet(walletname);
      await this.selectWallet(walletname);
      await this.closeWalletManagement();

      return this.previousPage;
    });
  }
}
