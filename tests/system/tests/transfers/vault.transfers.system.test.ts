import * as allure from 'allure-js-commons';

import { substrateChains } from '../../data/chains/chainsList';
import { test } from '../../utils/baseRegularFixture';
import { getChainByName } from '../../utils/readConfig';

const feature = 'Wallets. Polkadot Vault. Single wallet';
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

test.describe('Regular transfers', { tag: ['@regular-transfers', '@regress'] }, () => {
  for (const { chainName, assetId, amount, recipient } of transferTestCases) {
    test(`Polkadot Vault, single wallet, can make regular transfer on ${chainName}`, async ({ loginPage }) => {
      await allure.feature(feature);
      await allure.story(story);
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
