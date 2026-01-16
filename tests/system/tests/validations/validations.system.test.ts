import { substrateChains } from '../../data/chains/chainsList';
import { setupTestMetadata, validationsTest as test } from '../../utils/baseRegularFixture';
import { getChainByName } from '../../utils/readConfig';
import { Validation, validationConstants as constants } from '../../utils/validationTestCases';

const feature = 'Validations';
const story = 'Validations tests';

test.describe('Validations tests', { tag: ['@regress', '@validations'] }, () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async () => {
    await setupTestMetadata(feature, story);
  });

  test(`Should validate permission rights for a proxy transfer`, async ({ assetsPage }) => {
    const walletModal = await assetsPage.openWalletManagement();
    await walletModal.searchAndSelectWallet(constants.permissionsValidation.non_transfer_proxy_name);

    const chain = getChainByName(substrateChains, constants.permissionsValidation.chainName);
    const transferModal = await assetsPage.openTransfer(chain, constants.permissionsValidation.assetId);

    await transferModal.fillRecipient(constants.permissionsValidation.recipient);
    await transferModal.fillAmount(constants.permissionsValidation.amount);

    await transferModal.expectValidationsVisible(Validation.permission);

    await transferModal.close();

    const walletSelector = await assetsPage.openWalletManagement();
    await walletSelector.searchAndSelectWallet(constants.permissionsValidation.any_proxy_name);

    const transferModal2 = await assetsPage.openTransfer(chain, constants.permissionsValidation.assetId);

    await transferModal2.fillRecipient(constants.permissionsValidation.recipient);
    await transferModal2.fillAmount(constants.permissionsValidation.amount);
    await transferModal2.expectTransferFeeNotZero();

    const confirmationModal = await transferModal2.openConfirmationModal();
    const signingModal = await confirmationModal.confirm();

    await signingModal.checkSignReadyWalletConnect();
  });

  // TODO: remove fail flag after the bug is fixed (#5328)
  test.fail(`Should validate multisig signer missing account`, async ({ assetsPage }) => {
    const walletModal = await assetsPage.openWalletManagement();
    await walletModal.searchAndSelectWallet(constants.missingAccountValidation.multisigName);

    const chain = getChainByName(substrateChains, constants.missingAccountValidation.chainName);
    const transferModal = await assetsPage.openTransfer(chain, constants.missingAccountValidation.assetId);

    await transferModal.expectValidationsVisible(Validation.missingAccount);
  });

  // TODO: remove fail flag after the bug is fixed (?) available is not loaded in this case
  test.fail(`Should validate available amount for a transfer`, async ({ assetsPage }) => {
    const walletModal = await assetsPage.openWalletManagement();
    await walletModal.searchAndSelectWallet(constants.amountValidation.amount_account_name);

    const chain = getChainByName(substrateChains, constants.amountValidation.chainName);
    const transferModal = await assetsPage.openTransfer(chain, constants.amountValidation.assetId);

    await transferModal.fillRecipient(constants.amountValidation.recipient);
    await transferModal.fillAmount(constants.amountValidation.validationAmount);

    await transferModal.expectValidationsVisible(Validation.sendingAmount);

    await transferModal.fillAmount(constants.amountValidation.amount);
    await transferModal.expectValidationsHidden(Validation.sendingAmount);

    const confirmationModal = await transferModal.openConfirmationModal();
    const signingModal = await confirmationModal.confirm();

    await signingModal.checkSignReadyWalletConnect();
  });

  test(`Should validate all fees for an xcm-transfer`, async ({ assetsPage }) => {
    const walletModal = await assetsPage.openWalletManagement();
    await walletModal.searchAndSelectWallet(constants.feesValidation.walletName);

    const chain = getChainByName(substrateChains, constants.feesValidation.chainName);

    const transferModal = await assetsPage.openTransfer(chain, constants.feesValidation.assetId);
    await transferModal.chooseXcmChain(constants.feesValidation.xcmChainName);

    await transferModal.clickMyselfButton();

    await transferModal.fillAmount(constants.feesValidation.validationAmount);
    await transferModal.expectValidationsVisible([
      Validation.sendingAmount,
      Validation.originFee,
      Validation.destinationFee,
    ]);
  });

  test(`Should validate for inactive account`, async ({ assetsPage }) => {
    const walletModal = await assetsPage.openWalletManagement();
    await walletModal.searchAndSelectWallet(constants.inactiveAccountValidation.walletName);

    const chain = getChainByName(substrateChains, constants.inactiveAccountValidation.chainName);

    const transferModal = await assetsPage.openTransfer(chain, constants.inactiveAccountValidation.assetId);
    await transferModal.chooseXcmChain(constants.inactiveAccountValidation.xcmChainName);

    await transferModal.clickMyselfButton();

    await transferModal.fillAmount(constants.inactiveAccountValidation.validationAmount);
    await transferModal.expectValidationsVisible(Validation.inactiveAccount);
  });

  test(`Should validate for multisig deposit`, async ({ assetsPage }) => {
    const walletModal = await assetsPage.openWalletManagement();
    await walletModal.searchAndSelectWallet(constants.multisigDepositValidation.msigName);

    const chain = getChainByName(substrateChains, constants.multisigDepositValidation.chainName);

    const transferModal = await assetsPage.openTransfer(chain, constants.multisigDepositValidation.assetId);

    await transferModal.expectValidationsVisible([Validation.multisigDeposit, Validation.networkFee]);
  });

  test(`Should validate for proxy deposit`, async ({ assetsPage }) => {
    const walletModal = await assetsPage.openWalletManagement();
    const proxyForm = await walletModal.openDelegateProxyModal(constants.proxyDepositValidation.walletName);

    await proxyForm.fillProxyAddress(constants.proxyDepositValidation.proxyWalletAddress);

    await proxyForm.expectValidationsVisible([Validation.proxyDeposit, Validation.networkFee]);
  });
});
