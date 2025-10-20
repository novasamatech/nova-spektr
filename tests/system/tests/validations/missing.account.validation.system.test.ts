import * as allure from 'allure-js-commons';

import { substrateChains } from '../../data/chains/chainsList';
import { test } from '../../utils/baseRegularFixture';
import { getChainByName } from '../../utils/readConfig';
import { Validation, missingAccountValidationConstants } from '../../utils/validationTestCases';

const feature = 'Validations';
const story = 'Missing account validation';

test.describe('Missing account validation', { tag: ['@validations', '@regress'] }, () => {
  test(`Should validate multisig signer missing account`, async ({ loginPage }) => {
    await allure.feature(feature);
    await allure.story(story);
    test.slow();

    const extensionWallet = await loginPage.importDatabase('validations/missing_account_ext.json');
    const assetsPage = await extensionWallet.gotoMain();

    const walletModal = await assetsPage.openWalletManagement();
    await walletModal.searchAndSelectWallet(missingAccountValidationConstants.multisigName);

    const chain = getChainByName(substrateChains, missingAccountValidationConstants.chainName);
    const transferModal = await assetsPage.openTransfer(chain, missingAccountValidationConstants.assetId);

    await transferModal.expectValidationsVisible(Validation.missingAccount);
  });
});
