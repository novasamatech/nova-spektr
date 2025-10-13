import * as allure from 'allure-js-commons';

import { substrateChains } from '../../data/chains/chainsList';
import { test } from '../../utils/baseRegularFixture';
import { getChainByName } from '../../utils/readConfig';
import { feeValidationConstants } from '../../utils/validationTestCases';

const feature = 'Validation.';
const story = 'Transfer fee validation';

test.describe('Transfer fee validation', { tag: ['@xcm-transfers', '@regress', '@validations'] }, () => {
  test(`Should validate all fees for a transfer`, async ({ loginPage }) => {
    await allure.feature(feature);
    await allure.story(story);
    test.slow();
    const vaultWallet = await loginPage.importDatabase('validations/fee-validations.json');
    const assetsPage = await vaultWallet.gotoMain();
    const chain = getChainByName(substrateChains, feeValidationConstants.chainName);

    const walletModal = await assetsPage.openWalletManagement();
    await walletModal.searchAndSelectWallet(feeValidationConstants.novaWalletName);

    const transferModal = await assetsPage.openTransfer(chain, feeValidationConstants.assetId);
    await transferModal.chooseXcmChain(feeValidationConstants.xcmChainName);

    await transferModal.clickMyselfButton();

    await transferModal.fillAmount(feeValidationConstants.validationAmount);
    await transferModal.isSendingAmountValidationOnPage();
    await transferModal.isNetworkFeeValidationOnPage();
    await transferModal.isXChainFeeValidationOnPage();
    await transferModal.isDeliveryFeeValidationOnPage();
  });
});
