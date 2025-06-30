import * as allure from 'allure-js-commons';

import { expect, test } from '../../utils/baseRegularFixture';

test.describe('Polkadot Vault onboarding', { tag: '@regress' }, () => {
  test('Show access denied if no permissions', async ({ loginPage, page }) => {
    await allure.feature('Onboarding');
    await allure.story('Onboarding via Polkadot Vault');
    const polkadotVaultOnboardingPage = await loginPage
      .gotoOnboarding()
      .then((onboarding) => onboarding.clickPolkadotVaultButton());
    const { accessDeniedText } = polkadotVaultOnboardingPage.pageElements;
    await page.waitForSelector(accessDeniedText);
    expect(await page.isVisible(accessDeniedText));
  });

  test('Default settings for assets page', async ({ loginPage }) => {
    await allure.feature('Onboarding');
    await allure.story('Onboarding via Polkadot Vault');
    test.slow();
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
