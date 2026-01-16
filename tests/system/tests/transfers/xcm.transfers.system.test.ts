import * as allure from 'allure-js-commons';

import { substrateChains } from '../../data/chains/chainsList';
import { transfersTest as test } from '../../utils/baseRegularFixture';
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
  test.describe.configure({ mode: 'serial' });

  for (const { chainName, assetId, xcmChainName, amount, recipient } of xcmTransferTestCases) {
    // TODO: add EVM chains for test
    test(`Polkadot Vault, single wallet, can make regular xcm transfer from ${chainName} to ${xcmChainName}`, async ({
      assetsPage,
    }) => {
      await setupTestMetadata();

      const walletModal = await assetsPage.openWalletManagement();
      await walletModal.searchAndSelectWallet(transferConstants.vault_name);

      const chain = getChainByName(substrateChains, chainName);

      const transferModal = await assetsPage.openTransfer(chain, assetId);
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
