import { BackendConnectionModalWindow } from '../../pages/modals/BackendConnectionModalWindow';
import { setupTestMetadata, test } from '../../utils/baseRegularFixture';

const feature = 'Address Book';
const story = 'Backend connection health check';

const BACKEND_URL = 'https://mock-address-book.e2e';

// The seeded single-shard vault wallet (`createVaultSubstrateWallet`) provides
// a signable account, so the Connect button's enabled state reflects the
// health-probe outcome instead of being trivially disabled by "no accounts".
const VAULT_ACCOUNT_NAME = 'polkadotVaultAllNetworks';

/**
 * The modal probes `GET <url>/health` (debounced) as the user types and renders
 * one of three states: unreachable (network/5xx — transient), wrong backend
 * (2xx with a foreign payload — the URL points at a server that is not an
 * Address Book) or reachable. All runs are hermetic: RPC websockets are blocked
 * and the backend host is fully mocked.
 */
test.describe('Address Book — backend connection health check', { tag: ['@regress'] }, () => {
  test.beforeEach(async () => {
    await setupTestMetadata(feature, story);
  });

  test('unreachable server shows the unreachable error', async ({ page, loginPage }) => {
    test.setTimeout(120_000);

    const modal = new BackendConnectionModalWindow(page);
    await modal.blockWebsockets();
    await modal.mockHealth(BACKEND_URL, { kind: 'abort' });

    await loginPage.createVaultSubstrateWallet();
    await modal.openFromSettings();
    await modal.typeUrl(BACKEND_URL);

    await modal.expectUnreachableError();

    // Product behavior: an unreachable server is a *transient* failure, so the
    // Connect button intentionally stays enabled to allow a retry. Only the
    // wrong-backend state hard-blocks connecting (see the next test).
    await modal.expectConnectEnabled();
  });

  test('server responding with a non-health payload shows the wrong-backend error and blocks Connect', async ({
    page,
    loginPage,
  }) => {
    test.setTimeout(120_000);

    const modal = new BackendConnectionModalWindow(page);
    await modal.blockWebsockets();
    // 200 OK, but the body is not an Address Book health response — the server
    // is reachable yet it is the *wrong* server, and the UI must say so
    // instead of a generic "server reachable".
    await modal.mockHealth(BACKEND_URL, { kind: 'fulfill', status: 200, body: { hello: 'world' } });

    await loginPage.createVaultSubstrateWallet();
    await modal.openFromSettings();
    await modal.typeUrl(BACKEND_URL);

    await modal.expectWrongBackendError();
    await modal.expectConnectDisabled();
  });

  test('healthy server shows the reachable status and Connect is available', async ({ page, loginPage }) => {
    test.setTimeout(120_000);

    const modal = new BackendConnectionModalWindow(page);
    await modal.blockWebsockets();
    await modal.mockHealth(BACKEND_URL, {
      kind: 'fulfill',
      status: 200,
      body: { status: 'ok', info: { database: { status: 'up' }, blockchain: { status: 'up' } } },
    });

    await loginPage.createVaultSubstrateWallet();
    await modal.openFromSettings();
    await modal.typeUrl(BACKEND_URL);

    await modal.expectReachable();

    // The seeded vault account was auto-selected, so a healthy probe leaves
    // Connect fully available.
    await modal.expectSelectedAccount(VAULT_ACCOUNT_NAME);
    await modal.expectConnectEnabled();
  });
});
