import * as allure from 'allure-js-commons';

import { substrateChains } from '../../data/chains/chainsList';
import { test } from '../../utils/baseRegularFixture';
import { getChainByName } from '../../utils/readConfig';
import { Validation, feeValidationConstants } from '../../utils/validationTestCases';

const feature = 'Validations';
const story = 'XCM-Transfer fee validation';

test.describe('XCM-Transfer fee validation', { tag: ['@regress', '@validations'] }, () => {
  test(`Should validate all fees for an xcm-transfer`, async ({ loginPage }) => {
    await allure.feature(feature);
    await allure.story(story);
    test.slow();
    const extensionWallet = await loginPage.importDatabase('validations/fee-validations.json');
    const assetsPage = await extensionWallet.gotoMain();
    const chain = getChainByName(substrateChains, feeValidationConstants.chainName);

    const walletModal = await assetsPage.openWalletManagement();
    await walletModal.searchAndSelectWallet(feeValidationConstants.novaWalletName);

    const transferModal = await assetsPage.openTransfer(chain, feeValidationConstants.assetId);
    await transferModal.chooseXcmChain(feeValidationConstants.xcmChainName);

    await transferModal.clickMyselfButton();

    await transferModal.fillAmount(feeValidationConstants.validationAmount);
    await transferModal.expectValidationsVisible([
      Validation.sendingAmount,
      Validation.networkFee,
      Validation.xcmFee,
      Validation.deliveryFee,
    ]);
  });
});
