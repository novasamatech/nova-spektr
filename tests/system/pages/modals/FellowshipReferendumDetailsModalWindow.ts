import { step } from 'allure-js-commons';

import { TEST_IDS } from '@/shared/constants';
import { BaseModal } from '../BaseModalWindow';
import { type BaseModalElements } from '../_elements/BaseModalElements';

const DEFAULT_TIMEOUT = 10_000;

export class FellowshipReferendumDetailsModalWindow extends BaseModal {
  constructor(page: ConstructorParameters<typeof BaseModal>[0], pageElements: BaseModalElements) {
    super(page, pageElements);
  }

  public async waitForModal(timeout = DEFAULT_TIMEOUT): Promise<this> {
    return await step('Wait for Referendum Details modal to appear', async () => {
      await this.page.getByTestId(TEST_IDS.FELLOWSHIP.REFERENDUM_DETAILS_MODAL).waitFor({ state: 'visible', timeout });
      return this;
    });
  }

  public async clickAye(): Promise<this> {
    return await step('Click Aye vote button', async () => {
      await this.page.getByTestId(TEST_IDS.FELLOWSHIP.VOTE_AYE_BUTTON).click();
      return this;
    });
  }

  public async clickNay(): Promise<this> {
    return await step('Click Nay vote button', async () => {
      await this.page.getByTestId(TEST_IDS.FELLOWSHIP.VOTE_NAY_BUTTON).click();
      return this;
    });
  }

  public async close(): Promise<void> {
    return await step('Close Referendum Details modal', async () => {
      await this.page.keyboard.press('Escape');
    });
  }
}
