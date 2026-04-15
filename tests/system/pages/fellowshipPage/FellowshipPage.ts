import { expect } from '@playwright/test';
import { step } from 'allure-js-commons';

import { TEST_IDS } from '@/shared/constants';
import { BasePage } from '../BasePage';
import { type FellowshipPageElements } from '../_elements/FellowshipPageElements';
import { FellowshipOverviewModalWindow } from '../modals/FellowshipOverviewModalWindow';
import { FellowshipReferendumDetailsModalWindow } from '../modals/FellowshipReferendumDetailsModalWindow';

const DEFAULT_TIMEOUT = 15_000;

export class FellowshipPage extends BasePage<FellowshipPageElements> {
  public async waitForTasksPanel(timeout = DEFAULT_TIMEOUT): Promise<this> {
    return await step('Wait for Fellowship tasks panel', async () => {
      await this.page.getByTestId(TEST_IDS.FELLOWSHIP.TASKS_PANEL).waitFor({ state: 'visible', timeout });
      return this;
    });
  }

  public async waitForNoAccountState(timeout = DEFAULT_TIMEOUT): Promise<this> {
    return await step('Wait for no-account state', async () => {
      await this.page.getByTestId(TEST_IDS.FELLOWSHIP.NO_ACCOUNT_STATE).waitFor({ state: 'visible', timeout });
      return this;
    });
  }

  public getTaskItems() {
    return this.page.getByTestId(TEST_IDS.FELLOWSHIP.TASK_ITEM);
  }

  public async getTasksCount(): Promise<string> {
    return await step('Get tasks count', async () => {
      const countEl = this.page.getByTestId(TEST_IDS.FELLOWSHIP.TASKS_COUNT);
      return (await countEl.textContent()) ?? '0';
    });
  }

  public async clickFirstTaskItem(): Promise<FellowshipReferendumDetailsModalWindow> {
    return await step('Click first task item to open referendum details', async () => {
      await this.getTaskItems().first().click();
      const modal = new FellowshipReferendumDetailsModalWindow(this.page, {});
      await modal.waitForModal();
      return modal;
    });
  }

  public async clickViewDetails(): Promise<FellowshipOverviewModalWindow> {
    return await step('Click "View Details" button in overview widget', async () => {
      await this.page.getByTestId(TEST_IDS.FELLOWSHIP.VIEW_DETAILS_BUTTON).click();
      const modal = new FellowshipOverviewModalWindow(this.page, {});
      await modal.waitForModal();
      return modal;
    });
  }

  public async verifyTasksPanelVisible(): Promise<void> {
    return await step('Verify tasks panel is visible', async () => {
      await expect(this.page.getByTestId(TEST_IDS.FELLOWSHIP.TASKS_PANEL)).toBeVisible({
        timeout: DEFAULT_TIMEOUT,
      });
    });
  }

  public async verifyNoAccountStateVisible(): Promise<void> {
    return await step('Verify no-account state is visible', async () => {
      await expect(this.page.getByTestId(TEST_IDS.FELLOWSHIP.NO_ACCOUNT_STATE)).toBeVisible({
        timeout: DEFAULT_TIMEOUT,
      });
    });
  }
}
