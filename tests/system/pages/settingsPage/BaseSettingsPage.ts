import { Page } from 'playwright';

import { BasePage } from '../BasePage';
import { SettingsPageElements } from '../_elements/SettingsPageElements';
import { MatrixModalWindow } from '../modals/MatrixModalWindow';
import { MatrixModalElements } from '../_elements/MatrixModalElements';

export class BaseSettingsPage extends BasePage {
  protected pageElements: SettingsPageElements;

  constructor(page: Page, pageElements: SettingsPageElements) {
    super(page);
    this.pageElements = pageElements;
  }

  public async clickOnMatrixElementMenu(): Promise<MatrixModalWindow> {
    await this.page
      .getByRole('button', { name: 'Matrix Connection Manage Matrix connection Log in or register' })
      .click();

    return new MatrixModalWindow(this.page, new MatrixModalElements(), this);
  }
}
