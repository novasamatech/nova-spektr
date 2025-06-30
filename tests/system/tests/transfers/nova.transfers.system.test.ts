import * as allure from 'allure-js-commons';

import { substrateChains } from '../../data/chains/chainsList';
import { test } from '../../utils/baseRegularFixture';
import { getChainByName } from '../../utils/readConfig';
import { transferTestCases } from '../../utils/transferTestCases';

const feature = 'Wallets. Nova. Single wallet';
const story = 'Transfers';

test.describe('Regular nova transfers', { tag: ['@regular-nova-transfers', '@regress'] }, () => {
  for (const { chainName, assetId, amount, recipient, novaTestId } of transferTestCases) {
    test(`Nova, single wallet, can make regular transfer on ${chainName} @allure.id:${novaTestId}`, async ({
      loginPage,
    }) => {
      await allure.feature(feature);
      await allure.story(story);
      test.slow();
      const vaultWallet = await loginPage.importDatabase('transfers/nw-base-transfer.json');
      const assetsPage = await vaultWallet.gotoMain();
      const chain = getChainByName(substrateChains, chainName);
      const transferModal = await assetsPage.openTransfer(chain, assetId);

      await transferModal.fillAmount(amount);
      await transferModal.fillRecipient(recipient);
      const confirmationModal = await transferModal.openConfirmationModal();
      const signingModal = await confirmationModal.confirm();

      await signingModal.checkSignReadyWalletConnect();
    });
  }
});
