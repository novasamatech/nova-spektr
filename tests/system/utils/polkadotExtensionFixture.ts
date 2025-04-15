import { type BrowserContext } from '@playwright/test';
import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { test as base } from './baseRegularFixture';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type PolkadotExtensionFixture = {
  extensionContext: BrowserContext;
};

export const test = base.extend<PolkadotExtensionFixture>({
  extensionContext: async ({ }, use) => {
    
    const pathToExtension = path.join(__dirname, '../data/extensions/polkadot-js/build');    
    
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
      viewport: { width: 1280, height: 720 },
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await use(context);
    await context.close();
  },
  
  context: async ({ extensionContext }, use) => {
    await use(extensionContext);
  },
});

export { expect } from '@playwright/test'; 