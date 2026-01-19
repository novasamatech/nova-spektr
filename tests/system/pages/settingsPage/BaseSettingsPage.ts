import { step } from 'allure-js-commons';

import { BasePage } from '../BasePage';
import { type SettingsPageElements } from '../_elements/SettingsPageElements';

export class BaseSettingsPage extends BasePage<SettingsPageElements> {
  /**
   * Navigate to networks settings and wait for all active networks to be
   * connected.
   *
   * @param timeout - Maximum time to wait for connections (default: 60s)
   */
  public async waitForNetworkConnections(timeout = 90_000): Promise<void> {
    await step('Wait for network connections to be established', async () => {
      await this.page.goto(this.pageElements.networksUrl, { waitUntil: 'domcontentloaded' });
      await this.page.getByText(this.pageElements.activeNetworksLabel).waitFor({ state: 'visible', timeout: 10_000 });

      // Wait until no "Connecting" status labels are visible
      await this.page.waitForFunction(
        (connectingText) => {
          const elements = Array.from(document.querySelectorAll('*'));
          const connectingCount = elements.filter(
            (el) => el.textContent?.trim() === connectingText && el.children.length === 0,
          ).length;
          // Assamption that there are no more than 3 connecting networks in order to some has problems with connections
          return connectingCount < 3;
        },
        this.pageElements.connectingStatus,
        { timeout },
      );
    });
  }

  public async gotoNetworks(): Promise<this> {
    await step('Navigate to Networks settings', async () => {
      await this.page.goto(this.pageElements.networksUrl, { waitUntil: 'domcontentloaded' });
    });
    return this;
  }

  public async closeNetworksModal(): Promise<void> {
    await step('Close networks modal', async () => {
      await this.page.keyboard.press('Escape');
    });
  }
}
