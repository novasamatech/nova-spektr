import * as allure from 'allure-js-commons';

import { OperationsPageElements } from '../../pages/_elements/OperationsPageElements';
import { OperationsPage } from '../../pages/operationsPage/OperationsPage';
import { setupTestMetadata, test } from '../../utils/baseRegularFixture';
import { type DraftScenario, buildDraftScenario } from '../../utils/buildDraftScenario';

const feature = 'Multisig Operations';
const story = 'Drafts section renders across types';

const BACKEND_URL = 'https://mock-address-book.e2e';

test.describe('Multisig Operations — drafts section', { tag: ['@regress', '@pr'] }, () => {
  let scenario: DraftScenario;

  test.beforeAll(async () => {
    scenario = await buildDraftScenario(BACKEND_URL);
  });

  test.beforeEach(async () => {
    await setupTestMetadata(feature, story);
  });

  test('renders regular/flexible drafts with and without call data from a mocked address book', async ({ page }) => {
    test.setTimeout(120_000);

    await allure.attachment('scenario', JSON.stringify(scenario.expected, null, 2), 'application/json');

    const operationsPage = new OperationsPage(page, new OperationsPageElements());
    await operationsPage.seedDraftsAndOpen(scenario);

    // The paired address book is healthy → the Drafts section shows every seeded draft.
    await operationsPage.expectDraftsCount(scenario.expected.total);

    // Descriptions render inline (with the "No description" placeholder for the
    // draft that has none), and the call-data split drives Submit vs Add-call-data.
    await operationsPage.expectDraftContent(scenario);

    // Once Asset Hub connects, the transfer drafts decode to a real "Transfer" title.
    await operationsPage.expectDecodedTransferTitle(scenario);

    // A draft row expands into its Details panel (regular + flexible alike).
    await operationsPage.expandFirstDraftAndExpectDetails(scenario);
  });
});
