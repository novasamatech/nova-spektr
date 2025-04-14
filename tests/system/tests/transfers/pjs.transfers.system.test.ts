import { test, expect } from '../../utils/basePolkadotFixture';

test.describe('Polkadot.js extension transfer tests', { tag: ['@pjs-transfers', '@regress'] }, () => {
  test('should successfully install Polkadot.js extension', async ({ context, loginPage }) => {    
    
    const pjsWallet = await loginPage.createPolkadotJSWallet();
    await pjsWallet.clickContinueButton();
    await pjsWallet.clickSelectAllButton();
    await pjsWallet.clickConnectButton();
    
  });
}); 