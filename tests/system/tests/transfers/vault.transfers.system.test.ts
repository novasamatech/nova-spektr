import * as allure from 'allure-js-commons';

import { substrateChains } from '../../data/chains/chainsList';
import { test } from '../../utils/baseRegularFixture';
import { getChainByName } from '../../utils/readConfig';
import { transferTestCases } from '../../utils/transferTestCases';

const feature = 'Wallets. Polkadot Vault. Single wallet';
const story = 'Transfers';

test.describe('Regular transfers', { tag: ['@regular-transfers', '@regress'] }, () => {
  for (const { chainName, assetId, amount, recipient, vaultRegularTestId } of transferTestCases) {
    test(`Polkadot Vault, single wallet, can make regular transfer on ${chainName} @allure.id:${vaultRegularTestId}`, async ({
      loginPage,
    }) => {
      await allure.feature(feature);
      await allure.story(story);
      test.slow();
      const vaultWallet = await loginPage.importDatabase('transfers/pv-root-polkadot.json');
      const assetsPage = await vaultWallet.gotoMain();
      const chain = getChainByName(substrateChains, chainName);
      const transferModal = await assetsPage.openTransfer(chain, assetId);

      await transferModal.fillAmount(amount);
      await transferModal.fillRecipient(recipient);
      const confirmationModal = await transferModal.openConfirmationModal();
      const signingModal = await confirmationModal.confirm();

      await signingModal.checkQRCode();
    });
  }
});
