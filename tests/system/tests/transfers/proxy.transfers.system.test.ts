import * as allure from 'allure-js-commons';

import { substrateChains } from '../../data/chains/chainsList';
import { test } from '../../utils/baseRegularFixture';
import { getChainByName } from '../../utils/readConfig';
import { proxyTransferTestCases, transferConstants } from '../../utils/transferTestCases';

const feature = 'Wallets. Proxy wallets';
const story = 'Transfers';
const recipient = proxyTransferTestCases[0].recipient;
const amount = proxyTransferTestCases[0].amount;
const validationAmount = proxyTransferTestCases[0].validationAmount;
const chainName = proxyTransferTestCases[0].chainName;

test.describe('Proxy wallets transfers', { tag: ['@proxy-wallets', '@regress', '@validations'] }, () => {
  test('Proxy wallet can make regular transfer', async ({ loginPage }) => {
    await allure.feature(feature);
    await allure.story(story);
    test.slow();
    const proxyWallet = await loginPage.importDatabase('transfers/proxy-transfer-wallet.json');
    const assetsPage = await proxyWallet.gotoMain();

    const walletModal = await assetsPage.openWalletManagement();
    await walletModal.searchAndSelectWallet(transferConstants.proxyName);

    const chain = getChainByName(substrateChains, chainName);
    const transferModal = await assetsPage.openTransfer(chain, 0);

    await transferModal.fillRecipient(recipient);
    await transferModal.checkFeeforAsset();

    await transferModal.fillAmount(validationAmount);
    await transferModal.isSendingAmountValidationOnPage();

    await transferModal.fillAmount(amount);
    await transferModal.waitForAlertToDisapeear();

    const confirmationModal = await transferModal.openConfirmationModal();
    const signingModal = await confirmationModal.confirm();

    await signingModal.checkSignReadyWalletConnect();
  });
});
