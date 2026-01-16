import { type Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { step } from 'allure-js-commons';

import { BaseModal } from '../BaseModalWindow';
import { type BasePage } from '../BasePage';
import { MultisigModalElements } from '../_elements/MultisigModalElements';

import { MultisigModalWindow } from './MultisigModalWindow';

export class NetworkSelectionModalWindow extends BaseModal<MultisigModalElements> {
  public previousPage: BasePage;

  constructor(page: Page, pageElements: MultisigModalElements, previousPage: BasePage) {
    super(page, pageElements);
    this.previousPage = previousPage;
  }

  private async filterNetworkByName(name: string): Promise<void> {
    await step(`Filter networks with search term "${name}"`, async () => {
      await this.page.getByTestId(MultisigModalElements.networkFeeModal).getByPlaceholder('Search').fill(name);
    });
  }

  private async selectNetworkByName(name: string, timeout = 10_000): Promise<void> {
    await step(`Select network "${name}" (waiting up to ${timeout / 1000}s for active state)`, async () => {
      const networkOption = this.page.getByRole('radio', { name });
      await expect(networkOption).toBeVisible({ timeout: 5000 });

      try {
        await expect(networkOption).toBeEnabled({ timeout });
      } catch {
        throw new Error(
          `Network "${name}" is not in active state after ${timeout / 1000} seconds. ` +
            `The network connection may not be established.`,
        );
      }

      await networkOption.click();
    });
  }

  private async applySelection(): Promise<void> {
    await step('Click Apply to confirm network selection', async () => {
      await this.page.getByTestId(MultisigModalElements.applyButton).click();
    });
  }

  public async selectAndApplyNetwork(name: string): Promise<MultisigModalWindow> {
    await step(`Select and apply network "${name}"`, async () => {
      await this.filterNetworkByName(name);
      await this.selectNetworkByName(name);
      await this.applySelection();
    });

    return new MultisigModalWindow(this.page, new MultisigModalElements(), this.previousPage);
  }
}
