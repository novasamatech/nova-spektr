import * as allure from 'allure-js-commons';

import { substrateChains } from '../../data/chains/chainsList';
import { AssetsPageElements } from '../../pages/_elements/AssetsPageElements';
import { WatchOnlyAssetsPage } from '../../pages/assetsPage/WatchOnlyAssetsPage';
import { test } from '../../utils/baseRegularFixture';
import { getChainByName } from '../../utils/readConfig';
import { transferConstants, transferTestCases, xcmTransferTestCases } from '../../utils/transferTestCases';

const feature = 'Transfers';
const story = 'Transfers tests';

test.describe('Regular nova transfers', { tag: ['@regular-nova-transfers', '@regress'] }, () => {
  for (const { chainName, assetId, amount, recipient } of transferTestCases) {
    test(`Multisig can make regular transfer on ${chainName}`, async ({ transfersPage }) => {
      await allure.feature(feature);
      await allure.story(story);
      test.slow();

      const walletModal = await transfersPage.openWalletManagement();
      await walletModal.searchAndSelectWallet(transferConstants.multisig_name);

      const chain = getChainByName(substrateChains, chainName);
      const transferModal = await transfersPage.openTransfer(chain, assetId);

      await transferModal.fillRecipient(recipient);
      await transferModal.expectTransferFeeNotZero();

      await transferModal.fillAmount(amount);
      const confirmationModal = await transferModal.openConfirmationModal();
      const signingModal = await confirmationModal.confirm();

      await signingModal.checkSignReadyWalletConnect();
    });
  }

  for (const { chainName, assetId, amount, recipient } of transferTestCases) {
    test(`Nova, single wallet, can make regular transfer on ${chainName}`, async ({ transfersPage }) => {
      await allure.feature(feature);
      await allure.story(story);
      test.slow();

      const walletModal = await transfersPage.openWalletManagement();
      await walletModal.searchAndSelectWallet(transferConstants.nova_name);

      const chain = getChainByName(substrateChains, chainName);
      const transferModal = await transfersPage.openTransfer(chain, assetId);

      await transferModal.fillRecipient(recipient);
      await transferModal.expectTransferFeeNotZero();

      await transferModal.fillAmount(amount);

      const confirmationModal = await transferModal.openConfirmationModal();
      const signingModal = await confirmationModal.confirm();

      await signingModal.checkSignReadyWalletConnect();
    });
  }

  for (const { chainName, assetId, amount, recipient } of transferTestCases) {
    test('Proxy wallet can make regular transfer', async ({ transfersPage }) => {
      await allure.feature(feature);
      await allure.story(story);
      test.slow();

      const walletModal = await transfersPage.openWalletManagement();
      await walletModal.searchAndSelectWallet(transferConstants.proxy_name);

      const chain = getChainByName(substrateChains, chainName);
      const transferModal = await transfersPage.openTransfer(chain, assetId);

      await transferModal.fillRecipient(recipient);
      await transferModal.expectTransferFeeNotZero();

      await transferModal.fillAmount(amount);

      const confirmationModal = await transferModal.openConfirmationModal();
      const signingModal = await confirmationModal.confirm();

      await signingModal.checkSignReadyWalletConnect();
    });
  }

  for (const { chainName, assetId, amount, recipient } of transferTestCases) {
    test(`Polkadot Vault, single wallet, can make regular transfer on ${chainName}`, async ({ transfersPage }) => {
      await allure.feature(feature);
      await allure.story(story);
      test.slow();

      const walletModal = await transfersPage.openWalletManagement();
      await walletModal.searchAndSelectWallet(transferConstants.vault_name);

      const chain = getChainByName(substrateChains, chainName);
      const transferModal = await transfersPage.openTransfer(chain, assetId);

      await transferModal.fillRecipient(recipient);
      await transferModal.expectTransferFeeNotZero();

      await transferModal.fillAmount(amount);

      const confirmationModal = await transferModal.openConfirmationModal();
      const signingModal = await confirmationModal.confirm();

      await signingModal.checkQRCode();
    });
  }

  test('Watch-only transfer buttons should not be visible', async ({ transfersPage }) => {
    await allure.feature(feature);
    await allure.story(story);

    const walletModal = await transfersPage.openWalletManagement();
    await walletModal.searchAndSelectWallet(transferConstants.watch_only_name);

    const watchOnlyPage = new WatchOnlyAssetsPage(transfersPage.getPage(), new AssetsPageElements());

    await watchOnlyPage.checkTransferButtonNotExists();
    await watchOnlyPage.checkReceiveButtonNotExists();
  });

  for (const { chainName, assetId } of transferTestCases) {
    test(`Should not be able to open transfer modal on ${chainName} in watch-only mode`, async ({ transfersPage }) => {
      await allure.feature(feature);
      await allure.story(story);

      const walletModal = await transfersPage.openWalletManagement();
      await walletModal.searchAndSelectWallet(transferConstants.watch_only_name);

      const chain = getChainByName(substrateChains, chainName);
      const transferModal = await transfersPage.openTransfer(chain, assetId);

      await transferModal.transferModalIsNotVisible();
    });
  }

  for (const { chainName, assetId, xcmChainName, amount, recipient } of xcmTransferTestCases) {
    // TODO: remove fail flag after the bug is fixed (#5327) AND add EVM chains for test
    test.fail(
      `Polkadot Vault, single wallet, can make regular xcm transfer from ${chainName} to ${xcmChainName}`,
      async ({ transfersPage }) => {
        await allure.feature(feature);
        await allure.story(story);
        test.slow();

        const walletModal = await transfersPage.openWalletManagement();
        await walletModal.searchAndSelectWallet(transferConstants.vault_name);

        const chain = getChainByName(substrateChains, chainName);

        const transferModal = await transfersPage.openTransfer(chain, assetId);
        await transferModal.chooseXcmChain(xcmChainName);

        await transferModal.fillRecipient(recipient);
        await transferModal.expectTransferFeeNotZero();

        await transferModal.fillAmount(amount);

        const confirmationModal = await transferModal.openConfirmationModal();
        const signingModal = await confirmationModal.confirm();

        await signingModal.checkQRCode();
      },
    );
  }
});
