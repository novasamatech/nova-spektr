import { expect } from '@playwright/test';
import * as allure from 'allure-js-commons';

import { OperationsPageElements } from '../../pages/_elements/OperationsPageElements';
import { OperationsPage } from '../../pages/operationsPage/OperationsPage';
import { setupTestMetadata, test } from '../../utils/baseRegularFixture';
import { type AwaitingOutcomeScenario, buildAwaitingOutcomeScenario } from '../../utils/buildAwaitingOutcomeScenario';

const feature = 'Multisig Operations';
const story = 'Operation awaiting its final status stays pending';

test.describe('Multisig Operations — awaiting outcome', { tag: ['@regress', '@pr'] }, () => {
  // Wide enough for the actions column (with the updating-status loader) to be
  // fully visible without horizontal scroll.
  test.use({ viewport: { width: 1600, height: 900 } });

  let scenario: AwaitingOutcomeScenario;

  test.beforeAll(async () => {
    scenario = await buildAwaitingOutcomeScenario();
  });

  test.beforeEach(async () => {
    await setupTestMetadata(feature, story);
  });

  test('an operation removed from chain storage without a terminal event stays pending with an updating-status loader', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const operationsPage = new OperationsPage(page, new OperationsPageElements());
    await operationsPage.seedAndOpen(scenario);

    await operationsPage.expectInProgressVisible();
    await operationsPage.expectPendingCount(2);

    // Baseline: the regular pending operation renders its signed counter.
    await expect(operationsPage.operationRow(scenario.pendingOperationId).getByText('1 of 2 signed')).toBeVisible();

    // The awaiting-outcome operation still shows as pending with its counter…
    await expect(operationsPage.operationRow(scenario.awaitingOperationId).getByText('2 of 2 signed')).toBeVisible();
    // …but renders the updating-status loader (with the explanatory tooltip)
    // instead of the signing actions.
    await operationsPage.expectAwaitingOutcomeOperation(scenario.awaitingOperationId);

    await allure.attachment('awaiting-outcome-pending-state', await page.screenshot(), 'image/png');
  });
});
