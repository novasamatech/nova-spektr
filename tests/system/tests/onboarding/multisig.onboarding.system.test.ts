import * as allure from 'allure-js-commons';

import { test } from '../../utils/baseRegularFixture';
import { multisigOnboardingSignatories } from '../../utils/multisigOnboardingTestCases';

const feature = 'Onboarding. Multisig Vault';
const story = 'Multisig Vault onboarding';

test.describe('Multisig Vault onboarding', { tag: ['@regress'] }, () => {
  test.skip('Can create multisig wallet', async ({ loginPage }) => {
    await allure.feature(feature);
    await allure.story(story);
    const onboardingPage = await loginPage.importDatabase('multisigOnboarding/multisig_onboarding.json');
    const assetsPage = await onboardingPage.gotoMain();
    const walletModal = await assetsPage.openWalletManagement();

    const multisigModal = await walletModal.openMultisigModalWindow();
    await multisigModal.chooseNetworkandWalletName('Westend', 'Multisig wallet');
    await multisigModal.fillSignatoryAndSetTrashhold(multisigOnboardingSignatories.twoSignatories);

    const confirmationModal = await multisigModal.openConfirmationModal();
    const signingModal = await confirmationModal.confirm();
    await signingModal.checkQRCode();
  });
});
