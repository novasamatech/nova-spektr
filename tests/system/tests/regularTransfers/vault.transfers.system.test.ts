import { substrateChains } from '../../data/chains/chainsList';
import { test } from '../../utils/baseRegularFixture';
import { getChainByName } from '../../utils/readConfig';

test.describe('Regular transfers', { tag: ['@regular-transfers'] }, () => {
  test(`Polkadot Vault, single wallet, can make regular transfer on Polkadot`, async ({ loginPage }) => {
    const vaultWallet = await loginPage.importDatabase('polkadotVaultWallet/pv-root.json');
    const assetsPage = await vaultWallet.gotoMain();
    const polkadotChain = getChainByName(substrateChains, 'Polkadot');
    const transferModal = await assetsPage.openTransfer(polkadotChain, 0);

    await transferModal.fillAmount('1');
    await transferModal.fillRecipient('5EpsavEfPSZC8X2E4zHdJdepzpzfSccqNP5RUVyAU9Hyi3z4');
    const confirmationModal = await transferModal.openConfirmationModal();
    const signingModal = await confirmationModal.confirm();

    await signingModal.checkQRCode();
  });
});
