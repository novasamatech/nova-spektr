import * as allure from 'allure-js-commons';

import { substrateChains } from '../../data/chains/chainsList';
import { test } from '../../utils/baseRegularFixture';
import { getChainByName } from '../../utils/readConfig';
import { transferTestCases } from '../../utils/transferTestCases';

const feature = 'Wallet. Multisig wallet.';
const story = 'Transfers';

test.describe('Multisig wallet transfers', { tag: ['@multisig-transfers', '@regress'] }, () => {
  for (const { chainName, assetId, amount, validationAmount, recipient } of transferTestCases) {
    test(`Multisig can make regular transfer on ${chainName}`, async ({ loginPage }) => {
      await allure.feature(feature);
      await allure.story(story);
      test.slow();

      const multisigWallet = await loginPage.importDatabase('transfers/ms-base-transfer-nw.json');
      const assetsPage = await multisigWallet.gotoMain();

      const walletModal = await assetsPage.openWalletManagement();
      await walletModal.searchAndSelectWallet('14KLy...dJEaM');

      const chain = getChainByName(substrateChains, chainName);
      const transferModal = await assetsPage.openTransfer(chain, assetId);

      await transferModal.fillRecipient(recipient);
      await transferModal.checkFeeforAsset();

      await transferModal.fillAmount(validationAmount);
      await transferModal.isBalanceValidationOnPage();

      await transferModal.fillAmount(amount);
      await transferModal.waitForAlertToDisapeear();
      const confirmationModal = await transferModal.openConfirmationModal();
      const signingModal = await confirmationModal.confirm();

      await signingModal.checkSignReadyWalletConnect();
    });
  }
});
