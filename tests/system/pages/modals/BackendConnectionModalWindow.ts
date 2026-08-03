import { type Locator, type Page, expect } from '@playwright/test';
import { step } from 'allure-js-commons';

import { TEST_IDS } from '@/shared/constants';

// Real UI copy from `src/renderer/shared/i18n/locales/en.json`.
const SETTINGS_SECTION_TITLE = 'External Address Book'; // settings.backendSync.title
const ADD_CONNECTION_BUTTON = 'Add Connection'; // settings.backendSync.addButton
const URL_PLACEHOLDER = 'https://example.com/api'; // addressBook.backendConfiguration.urlPlaceholder
const CONNECT_BUTTON = 'Connect'; // addressBook.backendConfiguration.connectButton
// addressBook.backendConfiguration.{reachable,unreachable,wrongBackend}
const REACHABLE_TEXT = 'Server is reachable';
const UNREACHABLE_TEXT = 'Server is not reachable. Check the URL or your connection.';
const WRONG_BACKEND_TEXT = 'This server is not an Address Book. Check the URL.';

export type HealthMock = { kind: 'abort' } | { kind: 'fulfill'; status: number; body: unknown };

/**
 * The "Add Connection" (external address book backend) modal, reached from
 * Settings → External Address Book. Typing a URL fires a debounced `GET
 * <url>/health` probe whose outcome renders as a reachability status line under
 * the input.
 */
export class BackendConnectionModalWindow {
  constructor(private readonly page: Page) {}

  /**
   * Keeps the test hermetic: no chain RPC is needed to exercise the backend
   * configuration modal, so every websocket is closed immediately.
   */
  public async blockWebsockets(): Promise<void> {
    await step('Block all RPC websockets', async () => {
      await this.page.routeWebSocket(/.*/, (ws) => ws.close());
    });
  }

  /**
   * Mocks the backend `GET /health` endpoint. `abort` simulates a server that
   * cannot be reached at all (DNS failure, refused connection); `fulfill`
   * responds with the given status and JSON body.
   */
  public async mockHealth(backendUrl: string, mock: HealthMock): Promise<void> {
    await step(`Mock GET ${backendUrl}/health → ${mock.kind}`, async () => {
      await this.page.route(`${backendUrl}/**`, (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path !== '/health') {
          return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        }
        if (mock.kind === 'abort') {
          return route.abort('failed');
        }

        return route.fulfill({
          status: mock.status,
          contentType: 'application/json',
          body: JSON.stringify(mock.body),
        });
      });
    });
  }

  /**
   * In-app navigation (no full reload — a full load would re-race the route
   * guard while wallets are still loading) to Settings, then opens the "Add
   * Connection" modal from the External Address Book plate.
   */
  public async openFromSettings(): Promise<this> {
    await step('Open the backend connection modal from Settings', async () => {
      await this.page.getByTestId(TEST_IDS.COMMON.WALLET_BUTTON).waitFor();

      await this.page.evaluate(() => {
        window.location.hash = '#/settings';
      });
      await this.page.getByText(SETTINGS_SECTION_TITLE, { exact: true }).waitFor();

      await this.page.getByRole('button', { name: ADD_CONNECTION_BUTTON, exact: true }).click();
      await this.page.getByPlaceholder(URL_PLACEHOLDER).waitFor();
    });

    return this;
  }

  public async typeUrl(url: string): Promise<void> {
    await step(`Type backend URL: ${url}`, async () => {
      await this.page.getByPlaceholder(URL_PLACEHOLDER).fill(url);
    });
  }

  public connectButton(): Locator {
    return this.page.getByRole('button', { name: CONNECT_BUTTON, exact: true });
  }

  public async expectUnreachableError(): Promise<void> {
    await step('Expect the "server is not reachable" error', async () => {
      await expect(this.page.getByText(UNREACHABLE_TEXT, { exact: true })).toBeVisible({ timeout: 15_000 });
    });
  }

  public async expectWrongBackendError(): Promise<void> {
    await step('Expect the "not an Address Book" error', async () => {
      await expect(this.page.getByText(WRONG_BACKEND_TEXT, { exact: true })).toBeVisible({ timeout: 15_000 });
    });
  }

  public async expectReachable(): Promise<void> {
    await step('Expect the "server is reachable" status', async () => {
      await expect(this.page.getByText(REACHABLE_TEXT, { exact: true })).toBeVisible({ timeout: 15_000 });
    });
  }

  public async expectConnectEnabled(): Promise<void> {
    await step('Expect the Connect button to be enabled', async () => {
      await expect(this.connectButton()).toBeEnabled();
    });
  }

  public async expectConnectDisabled(): Promise<void> {
    await step('Expect the Connect button to be disabled', async () => {
      await expect(this.connectButton()).toBeDisabled();
    });
  }

  /** The auto-selected signable account is shown in the account selector. */
  public async expectSelectedAccount(name: string): Promise<void> {
    await step(`Expect account "${name}" to be preselected`, async () => {
      await expect(this.page.getByText(name).first()).toBeVisible();
    });
  }
}
