import { Page } from 'playwright';

import { BaseModal } from '../BaseModalWindow';
import { BasePage } from '../BasePage';
import { AssetsSettingsModalElements } from '../_elements/AssetsSettingsModalElements';

export class AssetsSettingsModalWindow extends BaseModal {
  public pageElements: AssetsSettingsModalElements;
  public previousPage: BasePage;

  constructor(page: Page, pageElements: AssetsSettingsModalElements, previousPage: BasePage) {
    super(page);
    this.pageElements = pageElements;
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
