import { type Page } from 'playwright';

import { BaseModal } from '../BaseModalWindow';
import { type BasePage } from '../BasePage';
import { type AssetsSettingsModalElements } from '../_elements/AssetsSettingsModalElements';

export class AssetsSettingsModalWindow extends BaseModal<AssetsSettingsModalElements> {
  public previousPage: BasePage;

  constructor(page: Page, pageElements: AssetsSettingsModalElements, previousPage: BasePage) {
    super(page, pageElements);
    this.previousPage = previousPage;
  }

  public async getHideZeroBalancesStatus(): Promise<boolean> {
    const status = this.page.getByLabel(this.pageElements.hideZeroBalances);

    return status.isChecked();
  }

  public async getpageViewStatus(): Promise<string> {
    const status = await this.page.getByLabel(this.pageElements.pageView).innerText();

    return status;
  }
}
