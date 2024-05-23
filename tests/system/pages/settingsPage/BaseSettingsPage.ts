import { Page } from 'playwright';

import { BasePage } from '../BasePage';
import { SettingsPageElements } from '../_elements/SettingsPageElements';

export class BaseSettingsPage extends BasePage {
  protected pageElements: SettingsPageElements;

  constructor(page: Page, pageElements: SettingsPageElements) {
    super(page);
    this.pageElements = pageElements;
  }
}
