import { type FullConfig, chromium } from '@playwright/test';

import updateTestData from '../../scripts/updateTestData.js';

import { LoginPageElements } from './pages/_elements/LoginPageElements';

/**
 * A cold Vite dev server (first start after a lockfile change) re-bundles its
 * dependencies for several minutes and reloads the page mid-way; a test that
 * boots in that window times out on the onboarding page. Opening the app once
 * here, before any worker starts, absorbs that cost.
 */
const DEFAULT_WARMUP_TIMEOUT_MS = 10 * 60_000;
const RELOAD_WAIT_MS = 20_000;
const RETRY_DELAY_MS = 3_000;

const loginElements = new LoginPageElements();

const getWarmupTimeoutMs = (): number => {
  const fromEnv = Number(process.env.SYSTEM_TESTS_WARMUP_TIMEOUT_MS);

  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_WARMUP_TIMEOUT_MS;
};

const getProjectUse = (config: FullConfig): FullConfig['projects'][number]['use'] => {
  const use = config.projects[0]?.use;
  if (!use?.baseURL) {
    throw new Error('System tests warm-up: no baseURL configured on the first project');
  }

  return use;
};

const warmUpRenderer = async (config: FullConfig): Promise<void> => {
  const timeoutMs = getWarmupTimeoutMs();
  const startedAt = Date.now();
  const deadline = startedAt + timeoutMs;
  const { baseURL, launchOptions } = getProjectUse(config);
  const url = new URL(loginElements.url, baseURL).toString();

  // Same browser flags as the tests themselves, so the warm-up sees the page the way they do.
  const browser = await chromium.launch(launchOptions);
  try {
    const page = await browser.newPage({ ignoreHTTPSErrors: true });

    for (let attempt = 1; ; attempt++) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.getByText(loginElements.onboardingLabel).waitFor({ timeout: RELOAD_WAIT_MS });
        console.log(`System tests warm-up: renderer ready after ${attempt} attempt(s).`);

        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`System tests warm-up: attempt ${attempt} failed after ${Date.now() - startedAt} ms: ${message}`);
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
