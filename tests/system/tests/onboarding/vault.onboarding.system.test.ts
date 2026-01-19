import * as allure from 'allure-js-commons';

import { expect, setupTestMetadata, test } from '../../utils/baseRegularFixture';

test.describe('Polkadot Vault onboarding', { tag: '@regress' }, () => {
  test.beforeEach(async () => {
    await setupTestMetadata('Onboarding', 'Onboarding via Polkadot Vault');
  });

  test('Show camera access denied if no permissions', async ({ loginPage, page }) => {
    const polkadotVaultOnboardingPage = await loginPage
      .gotoOnboarding()
      .then((onboarding) => onboarding.clickPolkadotVaultButton());
    const { cameraDisabledText } = polkadotVaultOnboardingPage.pageElements;
    await page.waitForSelector(cameraDisabledText);
    expect(await page.isVisible(cameraDisabledText));
  });

  test('Default settings for assets page', async ({ loginPage }) => {
    const vaultWallet = await loginPage.createVaultSubstrateWallet();
    const assetsPage = await vaultWallet.gotoMain();
    const settingsWidget = await assetsPage.openSettingsWidget();
    const hideZeroBalancesStatus = await settingsWidget.getHideZeroBalancesStatus();
    const pageViewStatus = await settingsWidget.getpageViewStatus();

    await allure.step('Verify "Hide zero balances" is disabled', async () => {
      expect(hideZeroBalancesStatus).toBe(false);
    });

    await allure.step('Verify page view is set to "Token centric"', async () => {
      expect(pageViewStatus).toBe(settingsWidget.pageElements.tokenCentric);
    });
  });
});
