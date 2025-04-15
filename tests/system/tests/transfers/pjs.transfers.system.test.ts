import { substrateChains } from 'tests/system/data/chains/chainsList';
import { test, expect } from '../../utils/polkadotExtensionFixture';
import { getChainByName } from 'tests/system/utils/readConfig';
import * as allure from 'allure-js-commons';
const feature = 'Wallets. Polkadot.js extension';
const story = 'Transfers';

test.describe('Polkadot.js extension transfer tests', { tag: ['@pjs-transfers', '@regress'] }, () => {
  test('Polkadot.js extension can make regular transfer', async ({ loginPage, context }) => {
    await allure.feature(feature);
    await allure.story(story);
    test.slow();
    const pjsWallet = await loginPage.importDatabase('transfers/pjs-base-transfers.json');
    const assetsPage = await pjsWallet.gotoMain();
    const chain = getChainByName(substrateChains, 'Westend');

    const transferModal = await assetsPage.openTransfer(chain, 0);
    await transferModal.fillAmount('0.01');
    await transferModal.fillRecipient('5Gy5tdSg9KLxZMkHRTkFTEHz3QGYrmKbFzBGoyZjkg45JFNP');

    const confirmationModal = await transferModal.openConfirmationModal();
    await confirmationModal.confirm();
    const newPage = await context.waitForEvent('page');
    await expect(newPage.url()).toContain('chrome-extension://oilnimemehfpjhcilcpbidmlfbmahckk/notification.html');
  });
});
