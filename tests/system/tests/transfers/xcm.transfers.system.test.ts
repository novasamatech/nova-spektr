import * as allure from 'allure-js-commons';

import { substrateChains } from '../../data/chains/chainsList';
import { test } from '../../utils/baseRegularFixture';
import { getChainByName } from '../../utils/readConfig';
import { xcmTransferTestCases } from '../../utils/transferTestCases';

const feature = 'Wallets. XCM transfers.';
const story = 'Transfers';

test.describe('XCM transfers', { tag: ['@xcm-transfers', '@regress'] }, () => {
  for (const { chainName, assetId, xcmChainName, amount, recipient } of xcmTransferTestCases) {
    test.fail(
      `Polkadot Vault, single wallet, can make regular xcm transfer from ${chainName} to ${xcmChainName}`,
      async ({ loginPage }) => {
        await allure.feature(feature);
        await allure.story(story);
        test.slow();
        const vaultWallet = await loginPage.importDatabase('transfers/pv-root-polkadot.json');
        const assetsPage = await vaultWallet.gotoMain();
        const chain = getChainByName(substrateChains, chainName);

        const transferModal = await assetsPage.openTransfer(chain, assetId);
        await transferModal.chooseXcmChain(xcmChainName);

        await transferModal.fillRecipient(recipient);
        await transferModal.expectTransferFeeNotZero();

        await transferModal.fillAmount(amount);

        const confirmationModal = await transferModal.openConfirmationModal();
        const signingModal = await confirmationModal.confirm();

        await signingModal.checkQRCode();
      },
    );
  }
});
