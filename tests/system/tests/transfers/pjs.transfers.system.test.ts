import { substrateChains } from 'tests/system/data/chains/chainsList';
import { test, expect } from '../../utils/basePolkadotFixture';
import { getChainByName } from 'tests/system/utils/readConfig';
import * as allure from 'allure-js-commons';
const feature = 'Wallets. Polkadot.js extension';
const story = 'Transfers';

test.describe('Polkadot.js extension transfer tests', { tag: ['@pjs-transfers', '@regress'] }, () => {
  test('should successfully install Polkadot.js extension', async ({ loginPage, context }) => {
    await allure.feature(feature);
    await allure.story(story);
    test.slow();
    const pjsWallet = await loginPage.importDatabase('transfers/spektr-database.json');
    const assetsPage = await pjsWallet.gotoMain();
    const chain = getChainByName(substrateChains, 'Westend');

    const transferModal = await assetsPage.openTransfer(chain, 0);
    await transferModal.fillAmount('0.01');
    await transferModal.fillRecipient('5Gy5tdSg9KLxZMkHRTkFTEHz3QGYrmKbFzBGoyZjkg45JFNP');

    const confirmationModal = await transferModal.openConfirmationModal();
    const signingModal = await confirmationModal.confirm();
    await Promise.all([context.waitForEvent('page')]);
  });
});
