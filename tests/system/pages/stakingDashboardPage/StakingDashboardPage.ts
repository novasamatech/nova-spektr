import { type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';

import { BasePage } from '../BasePage';
import {
  type RewardsRange,
  type StakingDashboardPageElements,
  type StakingKpiCard,
} from '../_elements/StakingDashboardPageElements';

/**
 * The dashboard's Staking tab.
 *
 * Two quirks of the surface shape every locator here:
 *
 * 1. Radix renders every tab panel with `forceMount`, so the Overview widgets stay
 *    in the DOM (opacity 0, `pointer-events: none`) while Staking is open.
 *    Playwright still considers them visible, and Overview carries its own
 *    "Total staked" label — so everything is scoped to the _active_ tabpanel.
 * 2. Dashboard widgets live inside a dnd-kit sortable wrapper that carries
 *    `aria-disabled="true"` outside edit mode. Playwright's actionability check
 *    treats that as a disabled ancestor, so in-widget clicks must be forced.
 *    Portalled surfaces (modal, drawer) are unaffected.
 */
export class StakingDashboardPage extends BasePage<StakingDashboardPageElements> {
  public async gotoStakingTab(): Promise<this> {
    await step('Open the Staking tab of the Dashboard', async () => {
      await this.page.goto(this.pageElements.url, { waitUntil: 'domcontentloaded' });

      const tab = this.page.getByRole('tab', { name: this.pageElements.stakingTabLabel, exact: true });
      await tab.waitFor({ state: 'visible', timeout: 30_000 });
      await tab.click();

      await this.getPanel()
        .getByText(this.pageElements.positionsTitle, { exact: true })
        .waitFor({ state: 'visible', timeout: 30_000 });
    });

    return this;
  }

  /** The staking tab panel — the only surface whose contents may be asserted. */
  public getPanel(): Locator {
    return this.page.locator('[role="tabpanel"][data-state="active"]');
  }

  // --- KPI row -------------------------------------------------------------

  public getKpiCard(card: StakingKpiCard): Locator {
    return this.getPanel().getByLabel(this.pageElements.kpiTitles[card], { exact: true });
  }

  /**
   * A KpiCard is `<p>title</p>` followed by the value, subline and (optional)
   * footer blocks — so the direct `div` children are exactly those three, in
   * that order.
   */
  public getKpiValue(card: StakingKpiCard): Locator {
    return this.getKpiCard(card).locator('> div').nth(0);
  }

  public getKpiSubline(card: StakingKpiCard): Locator {
    return this.getKpiCard(card).locator('> div').nth(1);
  }

  public getKpiFooter(card: StakingKpiCard): Locator {
    return this.getKpiCard(card).locator('> div').nth(2);
  }

  public getKpiSkeletons(card: StakingKpiCard): Locator {
    return this.getKpiCard(card).locator(this.pageElements.skeletonSelector);
  }

  public async clickKpiCard(card: StakingKpiCard): Promise<this> {
    await step(`Open the "${this.pageElements.kpiTitles[card]}" KPI drill-down`, async () => {
      await this.getKpiCard(card).click({ force: true });
    });

    return this;
  }

  public async clickRedeemLink(): Promise<this> {
    await step('Click the "Redeem →" link of the Total staked card', async () => {
      await this.getKpiFooter('totalStaked')
        .getByRole('button', { name: this.pageElements.redeemLinkLabel })
        .click({ force: true });
    });

    return this;
  }

  // --- Positions widget ----------------------------------------------------

  public getPositionRows(): Locator {
    return this.getPanel().locator(this.pageElements.tableRowSelector);
  }

  public async openPositionRow(index = 0): Promise<Locator> {
    return await step(`Open the position detail drawer of row #${index}`, async () => {
      await this.getPositionRows().nth(index).click({ force: true });

      const drawer = this.getDrawer();
      await drawer.waitFor({ state: 'visible' });

      return drawer;
    });
  }

  // --- Rewards chart -------------------------------------------------------

  public getRewardsRangeSwitch(): Locator {
    return this.getPanel().getByRole('group', { name: this.pageElements.rewardsRangeSwitchLabel });
  }

  public getRewardsAssetSwitch(): Locator {
    return this.getPanel().getByRole('group', { name: this.pageElements.rewardsAssetSwitchLabel });
  }

  public async selectRewardsRange(range: RewardsRange): Promise<this> {
    await step(`Switch the rewards chart to "${range}"`, async () => {
      await this.getRewardsRangeSwitch().getByRole('button', { name: range, exact: true }).click({ force: true });
    });

    return this;
  }

  public async selectRewardsAsset(index: number): Promise<string> {
    return await step(`Switch the rewards chart to asset #${index}`, async () => {
      const button = this.getRewardsAssetSwitch().getByRole('button').nth(index);
      const label = (await button.textContent())?.trim() ?? '';
      await button.click({ force: true });

      return label;
    });
  }

  // --- Portalled surfaces --------------------------------------------------

  public getModal(): Locator {
    return this.page.getByTestId(this.pageElements.modalTestId);
  }

  public getDrawer(): Locator {
    return this.page.getByTestId(this.pageElements.drawerTestId);
  }

  /**
   * Both `Modal` and `Drawer` close buttons are unlabelled IconButtons, so
   * Escape is the only stable close path — same call the dashboard suite
   * makes.
   */
  public async closeOverlay(overlay: Locator): Promise<this> {
    await step('Close the open overlay', async () => {
      await this.page.keyboard.press('Escape');
      await overlay.waitFor({ state: 'hidden' });
    });

    return this;
  }
}
