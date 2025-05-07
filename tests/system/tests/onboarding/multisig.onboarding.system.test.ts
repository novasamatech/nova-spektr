import { test } from '../../utils/baseRegularFixture';
import { multisigOnboardingSignatories } from '../../utils/multisigOnboardingTestCases';

test.describe('Multisig onboarding', { tag: ['@regress1'] }, () => {
  test('Can create multisig wallet', async ({ loginPage }) => {
    const onboardingPage = await loginPage.importDatabase('multisigOnboarding/multisig_onboarding.json');
    const assetsPage = await onboardingPage.gotoMain();
    const walletModal = await assetsPage.openWalletManagement();

    const multisigModal = await walletModal.openMultisigModalWindow();
    await multisigModal.chooseNetworkandWalletName('Westend', 'Multisig wallet');
    await multisigModal.fillSignatoryAndSetTrashhold(multisigOnboardingSignatories.multisigTwoSignatories);

    const confirmationModal = await multisigModal.openConfirmationModal();
    const signingModal = await confirmationModal.confirm();
    await signingModal.checkQRCode();
  });
});
