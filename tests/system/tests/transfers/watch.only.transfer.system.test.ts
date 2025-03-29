import * as allure from 'allure-js-commons';
import { test, expect } from '../../utils/baseRegularFixture';
import { getChainByName } from '../../utils/readConfig';
import { substrateChains } from '../../data/chains/chainsList';

const feature = 'Wallets. Watch-only. Single wallet';
const story = 'Transfers';

const transferTestCases = [
  {
    chainName: 'Polkadot',
    assetId: 0,
    amount: '0.1',
    recipient: '13mAjFVjFDpfa42k2dLdSnUyrSzK8vAySsoudnxX2EKVtfaq',
  },
  {
    chainName: 'Kusama',
    assetId: 0,
    amount: '0.01',
    recipient: 'FLVFEaY1oa7tAqfqh6gCb1q9RGuFHS1pkvAsAF7wwWUTFxY',
  },
  {
    chainName: 'Polkadot Asset Hub',
    assetId: 0,
    amount: '0.01',
    recipient: '13mAjFVjFDpfa42k2dLdSnUyrSzK8vAySsoudnxX2EKVtfaq',
  },
  {
    chainName: 'Hydration',
    assetId: 0,
    amount: '0.01',
    recipient: '7LMj1kc8TYvTQkWy6Am8EZEka1zqbTqmL8iBPrUVC6nDcoo6',
  },
];

test.describe('Watch-only transfers', { tag: ['@watch-only-transfers', '@regress'] }, () => {
  test('Watch-only transfer buttons should not be visible', async ({ loginPage }) => {
    await allure.feature(feature);
    await allure.story(story);
    const watchOnlyWallet = await loginPage.createBaseWatchOnlyWallet();
    const assetsPage = await watchOnlyWallet.gotoMain();
    
    try {
      await assetsPage.checkTransferButtonNotExists();
    } catch (error) {
      throw new Error('Transfer button should not be visible for watch-only wallet');
    }

    try {
      await assetsPage.checkReceiveButtonNotExists(); 
    } catch (error) {
      throw new Error('Receive button should not be visible for watch-only wallet');
    }
  });

  for (const { chainName, assetId} of transferTestCases) {
    test(`Should not be able to open transfer modal on ${chainName} in watch-only mode`, async ({ loginPage }) => {
      await allure.feature(feature);
      await allure.story(story);
      const watchOnlyWallet = await loginPage.createBaseWatchOnlyWallet();
      const assetsPage = await watchOnlyWallet.gotoMain();      
      const chain = getChainByName(substrateChains, chainName);
      const transferModal = await assetsPage.openTransferByUrl(chain, assetId);
      await transferModal.transferModalIsNotVisible();
    });
  }
});
