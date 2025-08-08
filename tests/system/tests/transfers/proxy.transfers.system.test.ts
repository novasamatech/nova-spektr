import * as allure from 'allure-js-commons';

import { substrateChains } from '../../data/chains/chainsList';
import { test } from '../../utils/baseRegularFixture';
import { getChainByName } from '../../utils/readConfig';

const feature = 'Wallets. Proxy wallets';
const story = 'Transfers';

test.describe('Proxy wallets transfers', { tag: ['@proxy-wallets', '@regress'] }, () => {
  test('Proxy wallet can make regular transfer', async ({ loginPage }) => {
    await allure.feature(feature);
    await allure.story(story);
    test.slow();
    const proxyWallet = await loginPage.importDatabase('transfers/proxy-transfer-wallet.json');
    const assetsPage = await proxyWallet.gotoMain();

    const chain = getChainByName(substrateChains, 'Westend Asset Hub (TESTNET)');
    const transferModal = await assetsPage.openTransfer(chain, 0);

    await transferModal.fillAmount('0.01');
    await transferModal.fillRecipient('5Gy5tdSg9KLxZMkHRTkFTEHz3QGYrmKbFzBGoyZjkg45JFNP');

    const confirmationModal = await transferModal.openConfirmationModal();
    const signingModal = await confirmationModal.confirm();

    await signingModal.checkQRCode();
  });
});
