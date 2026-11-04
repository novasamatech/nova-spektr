import { type FullConfig, chromium } from '@playwright/test';

import updateTestData from '../../scripts/updateTestData.js';

import { LoginPageElements } from './pages/_elements/LoginPageElements';

/**
 * A cold Vite dev server (first start after a lockfile change) re-bundles its
 * dependencies for several minutes and reloads the page mid-way; a test that
 * boots in that window times out on the onboarding page. Opening the app once
 * here, before any worker starts, absorbs that cost.
 */
export const DEFAULT_WARMUP_TIMEOUT_MS = 10 * 60_000;
const RELOAD_WAIT_MS = 20_000;
const RETRY_DELAY_MS = 3_000;

const loginElements = new LoginPageElements();

const getWarmupTimeoutMs = (): number => {
  const fromEnv = Number(process.env.SYSTEM_TESTS_WARMUP_TIMEOUT_MS);

  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_WARMUP_TIMEOUT_MS;
};

const getBaseUrl = (config: FullConfig): string => {
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) {
    throw new Error('System tests warm-up: no baseURL configured on the first project');
  }

  return baseURL;
};

const warmUpRenderer = async (config: FullConfig): Promise<void> => {
  const timeoutMs = getWarmupTimeoutMs();
  const deadline = Date.now() + timeoutMs;
  const url = new URL(loginElements.url, getBaseUrl(config)).toString();

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ ignoreHTTPSErrors: true });

    for (let attempt = 1; ; attempt++) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.getByText(loginElements.onboardingLabel).waitFor({ timeout: RELOAD_WAIT_MS });
        console.log(`System tests warm-up: renderer ready after ${attempt} attempt(s).`);

        return;
      } catch (error) {
        if (Date.now() >= deadline) {
          throw new Error(`System tests warm-up: renderer at ${url} did not render onboarding within ${timeoutMs} ms`, {
            cause: error,
          });
        }
        await page.waitForTimeout(RETRY_DELAY_MS);
      }
    }
  } finally {
    await browser.close();
  }
};

const globalSetup = async (config: FullConfig): Promise<void> => {
  await updateTestData();
  await warmUpRenderer(config);
};

export default globalSetup;
