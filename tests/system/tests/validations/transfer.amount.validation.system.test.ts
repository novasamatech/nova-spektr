import * as allure from 'allure-js-commons';

import { substrateChains } from '../../data/chains/chainsList';
import { test } from '../../utils/baseRegularFixture';
import { getChainByName } from '../../utils/readConfig';
import { Validation, permissionsValidationConstants as constants } from '../../utils/validationTestCases';

const feature = 'Validations';
const story = 'Transfer amount validation';

test.describe('Transfer amount validation', { tag: ['@regress', '@validations'] }, () => {
  test(`Should validate available amount for a transfer`, async ({ loginPage }) => {
    await allure.feature(feature);
    await allure.story(story);
    test.slow();
    const novaWallet = await loginPage.importDatabase('transfers/nw-base-transfer.json');
    const assetsPage = await novaWallet.gotoMain();
    const chain = getChainByName(substrateChains, constants.chainName);
    const transferModal = await assetsPage.openTransfer(chain, constants.assetId);

    await transferModal.fillRecipient(constants.recipient);
    await transferModal.expectTransferFeeNotZero();

    await transferModal.fillAmount(constants.validationAmount);
    await transferModal.expectValidationsVisible(Validation.sendingAmount);

    await transferModal.fillAmount(constants.amount);
    await transferModal.expectValidationsHidden(Validation.sendingAmount);

    const confirmationModal = await transferModal.openConfirmationModal();
    const signingModal = await confirmationModal.confirm();

    await signingModal.checkSignReadyWalletConnect();
  });
});
