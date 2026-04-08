import { test } from '../../utils/baseRegularFixture';
import { interceptChainsWithCollectivesOverride } from '../../utils/httpInterception';

// Set CUSTOM_COLLECTIVES_NODE_URL to a running Octopus chopsticks session URL.
// In CI this is injected automatically by the workflow.
const CUSTOM_COLLECTIVES_NODE_URL = process.env['CUSTOM_COLLECTIVES_NODE_URL'];
if (!CUSTOM_COLLECTIVES_NODE_URL) {
  throw new Error(
    'CUSTOM_COLLECTIVES_NODE_URL is not set. Provision an Octopus session and export the URL before running fellowship tests.',
  );
}

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
