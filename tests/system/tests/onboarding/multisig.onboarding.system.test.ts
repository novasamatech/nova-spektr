import { test } from '../../utils/baseRegularFixture';

test.describe('Multisig onboarding', { tag: ['@regress'] }, () => {
  test('Can create multisig wallet', async ({ loginPage }) => {
    const onboardingPage = await loginPage.importDatabase('multisigOnboarding/multisig-onboarding.json');
    const assetsPage = await onboardingPage.gotoMain();
    const walletModal = await assetsPage.openWalletManagement();
    await walletModal.clickOnAddButton
    const multisigModal = await walletModal.clickOnMultisigButton();
  });
});
