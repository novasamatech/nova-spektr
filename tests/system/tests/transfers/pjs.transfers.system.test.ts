import { test, expect } from '../../utils/basePolkadotFixture';
import { PolkadotAccount } from '../../utils/interactWithDatabase';

test.describe('Polkadot.js extension transfer tests', { tag: ['@pjs-transfers', '@regress'] }, () => {
  test('should successfully install Polkadot.js extension', async ({ context, loginPage }) => {
    // Проверяем, что расширение установлено, открыв страницу расширений
    const extensionPopup = await context.newPage();
    await extensionPopup.goto('chrome://extensions');
    await extensionPopup.waitForLoadState('domcontentloaded');
    
    const extensionCard = await extensionPopup.locator('#name').filter({ hasText: 'polkadot{.js} extension' });
    await expect(extensionCard).toBeVisible();
    await extensionPopup.close();
    
    // Открываем extension popup напрямую
    await loginPage.openPolkadotExtension();
    const popup = await context.waitForEvent('page');
    console.log(`Popup URL: ${popup.url()}`);
    await popup.waitForLoadState('domcontentloaded');
    
  });
}); 