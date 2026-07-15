import { type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';

import { BaseModal } from '../BaseModalWindow';
import { type AssetDetailsModalElements } from '../_elements/AssetDetailsModalElements';

export class AssetDetailsModalWindow extends BaseModal<AssetDetailsModalElements> {
  public getDialog(): Locator {
    return this.page.getByRole('dialog');
  }

  public async close(): Promise<void> {
    await step('Close asset details modal', async () => {
      // the modal's close IconButton has no testId, so Escape is the only stable close path
      await this.page.keyboard.press('Escape');
      await this.getDialog().waitFor({ state: 'hidden' });
    });
  }
}
