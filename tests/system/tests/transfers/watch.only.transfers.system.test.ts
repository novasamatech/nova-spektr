import * as allure from 'allure-js-commons';

import { substrateChains } from '../../data/chains/chainsList';
import { test } from '../../utils/baseRegularFixture';
import { getChainByName } from '../../utils/readConfig';
import { transferTestCases } from '../../utils/transferTestCases';

const feature = 'Wallets. Watch-only. Single wallet';
const story = 'Transfers';

test.describe('Watch-only transfers', { tag: ['@watch-only-transfers', '@regress', '@validations'] }, () => {
  test('Watch-only transfer buttons should not be visible', async ({ loginPage }) => {
    await allure.feature(feature);
    await allure.story(story);

    const watchOnlyWallet = await loginPage.createBaseWatchOnlyWallet();
    const assetsPage = await watchOnlyWallet.gotoMain();

    await assetsPage.checkTransferButtonNotExists();
    await assetsPage.checkReceiveButtonNotExists();
  });

  for (const { chainName, assetId } of transferTestCases) {
    test(`Should not be able to open transfer modal on ${chainName} in watch-only mode`, async ({ loginPage }) => {
      await allure.feature(feature);
      await allure.story(story);

      const watchOnlyWallet = await loginPage.createBaseWatchOnlyWallet();
      const assetsPage = await watchOnlyWallet.gotoMain();
      const chain = getChainByName(substrateChains, chainName);
      const transferModal = await assetsPage.openTransfer(chain, assetId);

      await transferModal.transferModalIsNotVisible();
    });
  }
});
