import * as allure from 'allure-js-commons';

import { substrateChains } from '../../data/chains/chainsList';
import { test } from '../../utils/baseRegularFixture';
import { getChainByName } from '../../utils/readConfig';
import { Validation, permissionsValidationConstants as constants } from '../../utils/validationTestCases';

const feature = 'Validations';
const story = 'Transfer permission validation';

test.describe('Transfer permission validation', { tag: ['@regress', '@validations'] }, () => {
  test(`Should validate permission rights for a proxy transfer`, async ({ loginPage }) => {
    await allure.feature(feature);
    await allure.story(story);
    test.slow();
    const novaWallet = await loginPage.importDatabase('validations/permission_validation_autotest_db.json');
    const assetsPage = await novaWallet.gotoMain();

    const walletModal = await assetsPage.openWalletManagement();
    await walletModal.searchAndSelectWallet(constants.non_transfer_proxy_name);

    const chain = getChainByName(substrateChains, constants.chainName);
    const transferModal = await assetsPage.openTransfer(chain, constants.assetId);

    await transferModal.fillRecipient(constants.recipient);
    await transferModal.expectTransferFeeNotZero();
    await transferModal.fillAmount(constants.amount);

    await transferModal.expectValidationsVisible(Validation.permission);

    await transferModal.close();

    const walletSelector = await assetsPage.openWalletManagement();
    await walletSelector.searchAndSelectWallet(constants.any_proxy_name);

    const transferModal2 = await assetsPage.openTransfer(chain, constants.assetId);

    await transferModal2.fillRecipient(constants.recipient);
    await transferModal2.expectTransferFeeNotZero();
    await transferModal2.fillAmount(constants.amount);

    const confirmationModal = await transferModal2.openConfirmationModal();
    const signingModal = await confirmationModal.confirm();

    await signingModal.checkSignReadyWalletConnect();
  });
});
