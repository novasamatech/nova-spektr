import { test } from '../../utils/baseRegularFixture';
import { interceptChainsWithCollectivesOverride } from '../../utils/httpInterception';

// ============================================================================
// Configure your custom Collectives node URL here
// ============================================================================
const CUSTOM_COLLECTIVES_NODE_URL =
  'wss://octopus-dev.k8s-2.novasama-tech.org/api/v1/sessions/954885f2-5ad8-4e70-8cda-ff07f7419fa0/ws/rpc';

test.describe('Fellowship chain override', { tag: ['@fellowship'] }, () => {
  test.beforeEach(async ({ page }) => {
    await interceptChainsWithCollectivesOverride(page, CUSTOM_COLLECTIVES_NODE_URL);
  });

  test('should load app with overridden Polkadot Collectives node', async ({ loginPage }) => {
    const vaultWallet = await loginPage.importDatabase('fellowship/fellowship-pv-root.json');
    await vaultWallet.gotoMain();

    // Navigate to fellowship or governance page and verify the chain is accessible
    // Add your specific assertions here depending on what you want to test
  });
});
