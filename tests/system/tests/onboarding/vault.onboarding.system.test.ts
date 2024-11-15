import { expect, test } from '../../utils/baseRegularFixture';

test.describe('Polkadot Vault onboarding', { tag: '@regress' }, () => {
  test('Show access denied if no permissions', async ({ loginPage, page }) => {
    const polkadotVaultOnboardingPage = await loginPage
      .gotoOnboarding()
      .then((onboarding) => onboarding.clickPolkadotVaultButton());
    const { accessDeniedText } = polkadotVaultOnboardingPage.pageElements;
    await page.waitForSelector(accessDeniedText);
    expect(await page.isVisible(accessDeniedText));
  });

  test('Default settings for assets page', async ({ loginPage }) => {
    test.slow();
    const vaultWallet = await loginPage.createVaultSubstrateWallet();
    const assetsPage = await vaultWallet.gotoMain();
    const settingsWidget = await assetsPage.openSettingsWidget();
    const hideZeroBalancesStatus = await settingsWidget.getHideZeroBalancesStatus();
    const pageViewStatus = await settingsWidget.getpageViewStatus();

    expect(hideZeroBalancesStatus).toBe(false);
    expect(pageViewStatus).toBe(settingsWidget.pageElements.tokenCentric);
  });
});
