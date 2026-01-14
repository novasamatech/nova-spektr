import * as allure from 'allure-js-commons';

import { substrateChains } from '../../data/chains/chainsList';
import { test } from '../../utils/baseRegularFixture';
import { getChainByName } from '../../utils/readConfig';
import { transferConstants, xcmTransferTestCases } from '../../utils/transferTestCases';

const feature = 'Transfers';
const story = 'Transfers tests';

const setupTestMetadata = async (): Promise<void> => {
  await allure.feature(feature);
  await allure.story(story);
  test.slow();
};

test.describe('XCM transfers', { tag: ['@xcm-transfers', '@regress'] }, () => {
  for (const { chainName, assetId, xcmChainName, amount, recipient } of xcmTransferTestCases) {
    // TODO: add EVM chains for test
    test(`Polkadot Vault, single wallet, can make regular xcm transfer from ${chainName} to ${xcmChainName}`, async ({
      xcmTransfersPage,
    }) => {
      await setupTestMetadata();

      const walletModal = await xcmTransfersPage.openWalletManagement();
      await walletModal.searchAndSelectWallet(transferConstants.vault_name);

      const chain = getChainByName(substrateChains, chainName);

      const transferModal = await xcmTransfersPage.openTransfer(chain, assetId);
      await transferModal.chooseXcmChain(xcmChainName);

      await transferModal.fillRecipient(recipient);
      await transferModal.expectTransferFeeNotZero();

      await transferModal.fillAmount(amount);

      const confirmationModal = await transferModal.openConfirmationModal();
      const signingModal = await confirmationModal.confirm();

      await signingModal.checkQRCode();
    });
  }
});
