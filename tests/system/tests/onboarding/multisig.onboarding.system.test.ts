import * as allure from 'allure-js-commons';

import { MultisigModalElements } from '../../pages/_elements/MultisigModalElements';
import { test } from '../../utils/baseRegularFixture';
import { multisigOnboardingSignatories } from '../../utils/multisigOnboardingTestCases';

const feature = 'Onboarding. Multisig Vault';
const story = 'Multisig Vault onboarding';
const regularMultisigType = MultisigModalElements.regularMultisigType;
const flexibleMultisigType = MultisigModalElements.flexibleMultisigType;

test.describe('Multisig Vault onboarding', { tag: ['@regress'] }, () => {
  test('Can create regular multisig wallet', async ({ loginPage }) => {
    await allure.feature(feature);
    await allure.story(story);
    const onboardingPage = await loginPage.importDatabase('multisigOnboarding/multisig_onboarding.json');
    const assetsPage = await onboardingPage.gotoMain();
    const walletModal = await assetsPage.openWalletManagement();

    const multisigModal = await walletModal.openMultisigCreationModalWindow();
    await multisigModal.selectMultisigType(regularMultisigType);
    await multisigModal.clickContinueWithAlertChecks();

    await multisigModal.selectMyAccount(multisigOnboardingSignatories.twoSignatoriesPolkadot[0]);
    const networkSelectorModal = await multisigModal.editNetworkSelection();
    const multisigModalWithNetwork = await networkSelectorModal.selectAndApplyNetwork('Novasama Testnet - Governance');

    await multisigModalWithNetwork.addSignatory(multisigOnboardingSignatories.twoSignatories[1]);
    await multisigModalWithNetwork.fillSignatoryName('Signatory');
    await multisigModalWithNetwork.setThreshold(2);
    await multisigModalWithNetwork.fillWalletName('Multisig wallet');

    const confirmationModal = await multisigModal.openConfirmationModal();
    const signingModal = await confirmationModal.confirm();
    await signingModal.checkQRCode();
  });

  test('Can create flexible multisig wallet', async ({ loginPage }) => {
    await allure.feature(feature);
    await allure.story(story);
    const onboardingPage = await loginPage.importDatabase('multisigOnboarding/multisig_onboarding.json');
    const assetsPage = await onboardingPage.gotoMain();
    const walletModal = await assetsPage.openWalletManagement();

    const multisigModal = await walletModal.openMultisigCreationModalWindow();
    await multisigModal.selectMultisigType(flexibleMultisigType);
    await multisigModal.clickContinueWithAlertChecks();

    await multisigModal.chooseNetworkandWalletName('Novasama Testnet - Governance', 'Multisig wallet');

    await multisigModal.selectMyAccount(multisigOnboardingSignatories.twoSignatories[0]);

    await multisigModal.addSignatory(multisigOnboardingSignatories.twoSignatories[1]);
    await multisigModal.fillSignatoryName('Signatory');
    await multisigModal.setThreshold(2);

    await multisigModal.clickContinueNoAlertChecks();

    await multisigModal.isAssignControlDisabled();
    const signingModal = await multisigModal.clickCreatePureProxy();

    await signingModal.checkQRCode();
  });
});
