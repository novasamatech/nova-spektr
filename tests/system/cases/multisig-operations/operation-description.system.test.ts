import * as allure from 'allure-js-commons';

import { OperationsPageElements } from '../../pages/_elements/OperationsPageElements';
import { OperationsPage } from '../../pages/operationsPage/OperationsPage';
import { setupTestMetadata, test } from '../../utils/baseRegularFixture';
import {
  type OperationWithDescriptionScenario,
  buildOperationWithDescription,
} from '../../utils/buildOperationWithDescription';

const feature = 'Multisig Operations';
const story = 'Operation shows its backend description';

const BACKEND_URL = 'https://mock-address-book.e2e';

test.describe('Multisig Operations — operation description', { tag: ['@regress', '@pr'] }, () => {
  // The DESCRIPTION column hides below the wide-table breakpoint — match the
  // awaiting-outcome spec's viewport so the asserted cell is actually visible.
  test.use({ viewport: { width: 1600, height: 900 } });

  let scenario: OperationWithDescriptionScenario;

  test.beforeAll(async () => {
    scenario = await buildOperationWithDescription(BACKEND_URL);
  });

  test.beforeEach(async () => {
    await setupTestMetadata(feature, story);
  });

  test('a regular multisig operation shows its description from the connected address book', async ({ page }) => {
    test.setTimeout(120_000);

    await allure.attachment('scenario', JSON.stringify(scenario.expected, null, 2), 'application/json');

    const operationsPage = new OperationsPage(page, new OperationsPageElements());
    await operationsPage.seedOperationWithDescriptionAndOpen(scenario);

    await operationsPage.expectInProgressVisible();

    // The operation renders its decoded title + submitter, and its shared
    // description — fetched from the mocked, connected external address book.
    await operationsPage.expectOperationWithDescription(scenario);
  });
});
