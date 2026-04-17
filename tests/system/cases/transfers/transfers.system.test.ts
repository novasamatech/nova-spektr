import { expect } from '@playwright/test';

import { substrateChains } from '../../data/chains/chainsList';
import { AssetsPageElements } from '../../pages/_elements/AssetsPageElements';
import { WatchOnlyAssetsPage } from '../../pages/assetsPage/WatchOnlyAssetsPage';
import { setupTestMetadata, transfersTest as test } from '../../utils/baseRegularFixture';
import { getChainByName } from '../../utils/readConfig';
import { proxyTransferTestCase, transferConstants, transferTestCases } from '../../utils/transferTestCases';

const feature = 'Transfers';
const story = 'Transfers tests';

test.describe('Regular transfers', { tag: ['@regular-transfers', '@regress'] }, () => {
  test.beforeEach(async () => {
    await setupTestMetadata(feature, story);
  });

  for (const { chainName, assetId, amount, recipient } of transferTestCases) {
    test(`Multisig can make regular transfer on ${chainName}`, async ({ assetsPage }) => {
      const walletModal = await assetsPage.openWalletManagement();
      await walletModal.searchAndSelectWallet(transferConstants.multisig_name);

      const chain = getChainByName(substrateChains, chainName);
      const transferModal = await assetsPage.openTransfer(chain, assetId);

      await transferModal.fillRecipient(recipient);
      await transferModal.expectTransferFeeNotZero();

      await transferModal.fillAmount(amount);
      const confirmationModal = await transferModal.openConfirmationModal();
      const signingModal = await confirmationModal.confirm();

      await signingModal.checkSignReadyWalletConnect();
    });
  }

  for (const { chainName, assetId, amount, recipient } of transferTestCases) {
    test(`Nova, single wallet, can make regular transfer on ${chainName}`, async ({ assetsPage }) => {
      const walletModal = await assetsPage.openWalletManagement();
      await walletModal.searchAndSelectWallet(transferConstants.nova_name);

      const chain = getChainByName(substrateChains, chainName);
      const transferModal = await assetsPage.openTransfer(chain, assetId);

      await transferModal.fillRecipient(recipient);
      await transferModal.expectTransferFeeNotZero();

      await transferModal.fillAmount(amount);

      const confirmationModal = await transferModal.openConfirmationModal();
      const signingModal = await confirmationModal.confirm();

      await signingModal.checkSignReadyWalletConnect();
    });
  }

  for (const { chainName, assetId, amount, recipient } of proxyTransferTestCase) {
    test('Proxy wallet can make regular transfer', async ({ assetsPage }) => {
      const walletModal = await assetsPage.openWalletManagement();
      await walletModal.searchAndSelectWallet(transferConstants.proxy_name);

      const chain = getChainByName(substrateChains, chainName);
      const transferModal = await assetsPage.openTransfer(chain, assetId);

      await transferModal.fillRecipient(recipient);
      await transferModal.expectTransferFeeNotZero();

      await transferModal.fillAmount(amount);

      const confirmationModal = await transferModal.openConfirmationModal();
      const signingModal = await confirmationModal.confirm();

      await signingModal.checkSignReadyWalletConnect();
    });
  }

  for (const { chainName, assetId, amount, recipient } of transferTestCases) {
    test(`Polkadot Vault, single wallet, can make regular transfer on ${chainName}`, async ({ assetsPage }) => {
      const walletModal = await assetsPage.openWalletManagement();
      await walletModal.searchAndSelectWallet(transferConstants.vault_name);

      const chain = getChainByName(substrateChains, chainName);
      const transferModal = await assetsPage.openTransfer(chain, assetId);

      await transferModal.fillRecipient(recipient);
      await transferModal.expectTransferFeeNotZero();

      await transferModal.fillAmount(amount);

      const confirmationModal = await transferModal.openConfirmationModal();
      const signingModal = await confirmationModal.confirm();

      await signingModal.checkQRCode();
    });
  }

  test('Watch-only transfer buttons should not be visible', async ({ assetsPage }) => {
    const walletModal = await assetsPage.openWalletManagement();
    await walletModal.searchAndSelectWallet(transferConstants.watch_only_name);

    const watchOnlyPage = new WatchOnlyAssetsPage(assetsPage.getPage(), new AssetsPageElements());

    await watchOnlyPage.checkTransferButtonNotExists();
    await watchOnlyPage.checkReceiveButtonNotExists();
  });

  test(`Should not be able to open transfer modal on ${transferConstants.watch_only_chain} in watch-only mode`, async ({
    assetsPage,
  }) => {
    const walletModal = await assetsPage.openWalletManagement();
    await walletModal.searchAndSelectWallet(transferConstants.watch_only_name);

    const chain = getChainByName(substrateChains, transferConstants.watch_only_chain);

    const transferModal = await assetsPage.tryOpenTransfer(chain, transferConstants.watch_only_asset_id, 3000);
    expect(transferModal).toBeNull();
  });
});
