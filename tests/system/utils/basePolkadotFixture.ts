import { type BrowserContext, type Page, test as base, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { LoginPageElements } from '../pages/_elements/LoginPageElements';
import { BaseLoginPage } from '../pages/loginPage/BaseLoginPage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type PolkadotFixture = {
  context: BrowserContext;
  page: Page;
  loginPage: BaseLoginPage;
};

export const test = base.extend<PolkadotFixture>({
  context: async ({}, use) => {
    // Путь к распакованному расширению
    const pathToExtension = path.join(__dirname, '../data/extensions/polkadot-js/build');
    
    // Проверяем, существует ли директория с расширением
    if (!fs.existsSync(pathToExtension)) {
      throw new Error(`Polkadot.js extension not found at ${pathToExtension}`);
    }
    
    const context = await chromium.launchPersistentContext('', {
      headless: false, // расширения не работают в headless режиме
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--enable-network-service',
        '--start-maximized',
      ],
      viewport: { width: 1280, height: 720 }, // Устанавливаем фиксированный размер окна
    });

    // Ждем пока расширение загрузится
    console.log('Waiting for extension to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await use(context);
    await context.close();
  },

  page: async ({ context }, use) => {
    const page = await context.newPage();
    await use(page);
  },

  loginPage: async ({ page }, use) => {
    const loginPage = new BaseLoginPage(page, new LoginPageElements());
    await use(loginPage);
  },
});

export { expect } from '@playwright/test';