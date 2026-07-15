import { type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';

import { BasePage } from '../BasePage';
import { AssetDetailsModalElements } from '../_elements/AssetDetailsModalElements';
import { type DashboardPageElements } from '../_elements/DashboardPageElements';
import { AssetDetailsModalWindow } from '../modals/AssetDetailsModalWindow';

// mirrors BalanceType from the dashboard-portfolio-overview feature lib, which is
// not exported through a barrel reachable from e2e code
type BalanceTypeChip = 'transferable' | 'reserved' | 'locked' | 'vested';

/**
 * Dashboard widgets are wrapped in a dnd-kit sortable container that carries
 * `aria-disabled="true"` outside of edit mode. Playwright's actionability check
 * treats it as a disabled ancestor, so clicks inside the Portfolio Overview
 * widget must be forced. Elements rendered in portals (modals) are not
 * affected.
 */
export class BaseDashboardPage extends BasePage<DashboardPageElements> {
  public async gotoDashboard(): Promise<this> {
    await step('Navigate to Dashboard page', async () => {
      await this.page.goto(this.pageElements.url, { waitUntil: 'domcontentloaded' });
      await this.page
        .getByText(this.pageElements.portfolioOverviewTitle)
        .waitFor({ state: 'visible', timeout: 30_000 });
    });

    return this;
  }

  public getPortfolioTotal(): Locator {
    // parent block holds the widget label and the fiat total below it
    return this.page.getByText(this.pageElements.portfolioOverviewTitle).locator('..');
  }

  public getBalanceTypeChip(type: BalanceTypeChip): Locator {
    return this.page.getByTestId(`${this.pageElements.balanceTypeChipPrefix}-${type}`);
  }

  public getShowAllButton(): Locator {
    // the dnd-kit widget wrapper is a div[role="button"] whose accessible name
    // swallows the inner labels — target the actual <button> element
    return this.page.locator('button').filter({ hasText: this.pageElements.showAllLabel });
  }

  public getHoldingRows(): Locator {
    return this.page.getByTestId(this.pageElements.holdingRow);
  }

  public async clickBalanceTypeChip(type: BalanceTypeChip): Promise<this> {
    await step(`Click "${type}" balance type chip`, async () => {
      await this.getBalanceTypeChip(type).click({ force: true });
    });

    return this;
  }

  public async clickShowAll(): Promise<this> {
    await step('Click "Show all" filter reset', async () => {
      await this.getShowAllButton().click({ force: true });
    });

    return this;
  }

  public async switchHoldingsView(view: 'assets' | 'networks'): Promise<this> {
    const label = view === 'assets' ? this.pageElements.assetsToggleLabel : this.pageElements.networksToggleLabel;
    await step(`Switch holdings view to "${label}"`, async () => {
      await this.page.getByRole('button', { name: label, exact: true }).click({ force: true });
    });

    return this;
  }

  public async openFirstHoldingDetails(): Promise<AssetDetailsModalWindow> {
    return await step('Open details of the first holdings row', async () => {
      await this.getHoldingRows().first().click({ force: true });

      const modal = new AssetDetailsModalWindow(this.page, new AssetDetailsModalElements());
      await modal.getDialog().waitFor({ state: 'visible' });

      return modal;
    });
  }
}
