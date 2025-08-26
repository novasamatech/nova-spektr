import { expect } from '@playwright/test';
import { step } from 'allure-js-commons';

import { TEST_IDS } from '@/shared/constants';
import { BasePage } from '../BasePage';
import { type GovernancePageElements } from '../_elements/GovernancePageElements';
import { WalletModalElements } from '../_elements/WalletModalElements';
import { WalletModalWindow } from '../modals/WalletModalWindow';

export const ProposalVoteFilter = {
  VOTED: 'voted',
  NOT_VOTED: 'not-voted',
} as const;

export type ProposalVoteFilterType = (typeof ProposalVoteFilter)[keyof typeof ProposalVoteFilter];

export class GovernancePage extends BasePage<GovernancePageElements> {
  public async openWalletManagement(): Promise<WalletModalWindow> {
    return await step('Open Wallet Management modal', async () => {
      await this.click(this.pageElements.accountButton);
      return new WalletModalWindow(this.page, new WalletModalElements(), this);
    });
  }

  public async applyFilter(): Promise<GovernancePage> {
    return await step('Apply filter: Voted', async () => {
      await this.clickOnFilterButton();
      await this.page.getByTestId(TEST_IDS.GOVERNANCE.FILTER_VOTED_OPTION).click();
      return this;
    });
  }

  public async searchReferenda(referendumId: string) {
    return await step(`Search for referendum ID: ${referendumId}`, async () => {
      await this.page.getByTestId(TEST_IDS.GOVERNANCE.SEARCH_INPUT).fill(referendumId);
      await this.page.getByTestId(TEST_IDS.GOVERNANCE.SEARCH_INPUT).press('Enter');
      return this;
    });
  }

  public async clickOnFilterButton() {
    await step('Click on filter button', async () => {
      await this.page.getByTestId(TEST_IDS.GOVERNANCE.FILTER_BUTTON).click();
    });
  }

  public async verifyProposalDetails({ referendumId, voteDetails }: { referendumId: string; voteDetails: string }) {
    return await step(`Verify proposal details for referendum #${referendumId}`, async () => {
      const governanceTimeout = 20000;

      await this.page.waitForTimeout(3000);
      await this.searchReferenda(referendumId);

      await this.page.waitForLoadState('networkidle');

      await this.page.getByTestId(TEST_IDS.GOVERNANCE.PROPOSAL_ITEM).first().waitFor({
        state: 'visible',
        timeout: governanceTimeout,
      });

      const proposalButton = this.page.getByTestId(TEST_IDS.GOVERNANCE.PROPOSAL_ITEM).filter({
        has: this.page.getByTestId(TEST_IDS.GOVERNANCE.PROPOSAL_ID).filter({ hasText: `#${referendumId}` }),
      });

      await proposalButton.waitFor({
        state: 'visible',
        timeout: governanceTimeout,
      });

      const idElement = proposalButton.getByTestId(TEST_IDS.GOVERNANCE.PROPOSAL_ID);
      await idElement.waitFor({
        state: 'visible',
        timeout: governanceTimeout,
      });

      await expect(idElement).toHaveText(`#${referendumId}`, {
        timeout: governanceTimeout,
      });

      const voteDetailsElement = proposalButton.getByTestId(TEST_IDS.GOVERNANCE.PROPOSAL_VOTE_DETAILS);
      await voteDetailsElement.waitFor({
        state: 'visible',
        timeout: governanceTimeout,
      });

      await expect(voteDetailsElement).toHaveText(voteDetails, {
        timeout: governanceTimeout,
      });

      return proposalButton;
    });
  }

  public async reloadPage() {
    return await step('Reload the page', async () => {
      await this.page.reload();
      return this;
    });
  }
}
