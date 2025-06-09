import * as allure from 'allure-js-commons';

import { substrateChains } from '../../data/chains/chainsList';
import { test } from '../../utils/baseRegularFixture';
import { getChainByName } from '../../utils/readConfig';
import { transferTestCases } from '../../utils/transferTestCases';

const feature = 'Wallets. XCM transfers.';
const story = 'Transfers';

test.describe('XCM transfers', { tag: ['@xcm-transfers', '@regress1'] }, () => {
  {
    test(`Polkadot Vault, single wallet, can make regular xcm transfer on asset-hub`, async ({ loginPage }) => {
      await allure.feature(feature);
      await allure.story(story);
      test.slow();
      const vaultWallet = await loginPage.importDatabase('transfers/pv-root-polkadot.json');
      const assetsPage = await vaultWallet.gotoMain();
      const chain = getChainByName(substrateChains, 'Polkadot');
      const transferModal = await assetsPage.openTransfer(chain, 0);
      await transferModal.chooseXcmChain('Polkadot Asset Hub Polkadot');
      await transferModal.fillAmount('1');
      await transferModal.fillRecipient('14tqRfiFfYeB12o7d9YK4X9LiCMKLNCt1LoVdWZypWbwNp2Y');
      const confirmationModal = await transferModal.openConfirmationModal();
      const signingModal = await confirmationModal.confirm();

      await signingModal.checkQRCode();
    });
  }
});
