import * as allure from 'allure-js-commons';

import { OperationsPageElements } from '../../pages/_elements/OperationsPageElements';
import { OperationsPage } from '../../pages/operationsPage/OperationsPage';
import { setupTestMetadata, test } from '../../utils/baseRegularFixture';
import { type BuiltData, buildMultisigOperations } from '../../utils/buildMultisigOperations';

const feature = 'Multisig Operations';
const story = 'All operation types render';

test.describe('Multisig Operations — all operation types', { tag: ['@regress', '@pr'] }, () => {
  let built: BuiltData;

  test.beforeAll(async () => {
    test.setTimeout(120_000); // live Asset Hub connect + metadata + build
    built = await buildMultisigOperations();

    console.log(`[operations-e2e] covered ${built.covered.length} operations, skipped ${built.skipped.length}`);
    for (const s of built.skipped) {
      console.log(`[operations-e2e] skipped ${s.family}: ${s.reason}`);
    }
  });

  test.beforeEach(async () => {
    await setupTestMetadata(feature, story);
  });

  test('renders every built operation family for regular and flexible multisig', async ({ page }) => {
    test.setTimeout(180_000); // seed + scroll through the full virtualized list

    await allure.attachment(
      'coverage',
      JSON.stringify({ covered: built.covered, skipped: built.skipped }, null, 2),
      'application/json',
    );

    const operationsPage = new OperationsPage(page, new OperationsPageElements());
    await operationsPage.seedAndOpen(built);

    await operationsPage.expectInProgressVisible();

    // The whole batch (every family × regular + flexible, plus the flex-only
    // edit-flexible card) renders — the pending count proves both kinds are present.
    await operationsPage.expectPendingCount(built.covered.length);

    // Every distinct family title that was built from the live runtime is rendered
    // (scrolling the virtualized list), including the flexible-only special cards:
    // "Edit flexible multisig" and "Verification for wallet". Both edit-flexible
    // modes are asserted via their tags (Atomic swap / Verified swap).
    const titles = [...new Set(built.covered.map((c) => c.title))];
    await operationsPage.expectTitlesByScrolling([...titles, 'Atomic swap', 'Verified swap']);

    // Verify EVERY seeded operation parsed into its own row and expand each one's
    // details (Details / Signatories / Advanced) so they are visible.
    await operationsPage.expandEachOperation(built.covered.length);
  });
});
