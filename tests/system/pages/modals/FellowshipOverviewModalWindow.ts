import { expect } from '@playwright/test';
import { step } from 'allure-js-commons';

import { TEST_IDS } from '@/shared/constants';
import { BaseModal } from '../BaseModalWindow';
import { type BaseModalElements } from '../_elements/BaseModalElements';

const DEFAULT_TIMEOUT = 10_000;

export class FellowshipOverviewModalWindow extends BaseModal {
  constructor(page: ConstructorParameters<typeof BaseModal>[0], pageElements: BaseModalElements) {
    super(page, pageElements);
  }

  public async waitForModal(timeout = DEFAULT_TIMEOUT): Promise<this> {
    return await step('Wait for Fellowship Overview modal to appear', async () => {
      await this.page.getByTestId(TEST_IDS.FELLOWSHIP.OVERVIEW_MODAL).waitFor({ state: 'visible', timeout });
      return this;
    });
  }

  public async clickRanksTab(): Promise<this> {
    return await step('Click Ranks tab', async () => {
      await this.page.getByRole('tab', { name: /ranks/i }).click();
      return this;
    });
  }

  public async clickMembersTab(): Promise<this> {
    return await step('Click Members tab', async () => {
      await this.page.getByRole('tab', { name: /members/i }).click();
      return this;
    });
  }

  public getMemberRows() {
    return this.page.getByTestId(TEST_IDS.FELLOWSHIP.MEMBER_ROW);
  }

  public async searchMember(query: string): Promise<this> {
    return await step(`Search for member: "${query}"`, async () => {
      await this.page.getByTestId(TEST_IDS.FELLOWSHIP.MEMBERS_SEARCH).fill(query);
      return this;
    });
  }

  public async verifyMemberCount(count: number): Promise<void> {
    return await step(`Verify member count is ${count}`, async () => {
      await expect(this.getMemberRows()).toHaveCount(count, { timeout: DEFAULT_TIMEOUT });
    });
  }

  public async close(): Promise<void> {
    return await step('Close Fellowship Overview modal', async () => {
      await this.page.keyboard.press('Escape');
    });
  }
}
