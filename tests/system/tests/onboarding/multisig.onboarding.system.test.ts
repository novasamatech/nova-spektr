import { sleep } from '@walletconnect/utils';
import { test } from '../../utils/baseRegularFixture';

test.describe('Multisig onboarding', { tag: ['@regress1'] }, () => {
  test('Can create multisig wallet', async ({ loginPage }) => {
    const onboardingPage = await loginPage.importDatabase('multisigOnboarding/multisig_onboarding.json');
    const assetsPage = await onboardingPage.gotoMain();
    const walletModal = await assetsPage.openWalletManagement();    
    const multisigModal = await walletModal.openMultisigModalWindow();
    await multisigModal.fillWalletName('Multisig wallet');
    await multisigModal.chooseNetwork('Westend');
    await multisigModal.clickOnContinueButton();
    await multisigModal.fillFirstSignatoryAddress('5Gs6B9Lp8hM3U1AptyqmVHVahBSGTjdMcDuVckGVWukaNEsb');
    await multisigModal.clickAddSignatoryButton();
    await multisigModal.fillSignatoryWalletName('Multisig wallet 2');
    await multisigModal.fillSecondSignatoryAddress('5Gy5tdSg9KLxZMkHRTkFTEHz3QGYrmKbFzBGoyZjkg45JFNP');
    await multisigModal.chooseTrashhold(2); 
    
    const confirmationModal = await multisigModal.openConfirmationModal();
    const signingModal = await confirmationModal.confirm();
    await signingModal.checkQRCode();
    


  });
});
