import { type Locator, expect } from '@playwright/test';
import { step } from 'allure-js-commons';

import { type DraftScenario } from '../../utils/buildDraftScenario';
import { type BuiltData } from '../../utils/buildMultisigOperations';
import { type OperationWithDescriptionScenario } from '../../utils/buildOperationWithDescription';
import { injectDataInDatabase } from '../../utils/interactWithDatabase';
import { BasePage } from '../BasePage';
import { type OperationsPageElements } from '../_elements/OperationsPageElements';

const DRAFTS_SECTION_TITLE = 'Drafts';
const SUBMIT_BUTTON = 'Submit';
const ADD_CALL_DATA_BUTTON = 'Add call data';
const UPDATING_STATUS_LABEL = 'Updating status';
const AWAITING_OUTCOME_TOOLTIP = 'Waiting for the final status';

/** The subset of a built scenario that `seedAndOpen` actually consumes. */
type SeededOperations = Pick<BuiltData, 'walletRows' | 'accountRows' | 'operationRecords'>;

export class OperationsPage extends BasePage<OperationsPageElements> {
  /**
   * Seeds the multisig/flexible wallets + accounts (Dexie `spektr`) and the
   * operations cache (`spektr-cache` → `effector` key `multisig-operations`),
   * blocks all RPC websockets so the live subscription never overwrites the
   * seeded cache, then opens the Operations view.
   */
  public async seedAndOpen(built: SeededOperations): Promise<OperationsPage> {
    return step('Seed multisig operations and open the Operations view', async () => {
      // Boot the app once so both IndexedDB databases (and the effector store) exist.
      await this.goto(this.pageElements.onboardingUrl);
      await this.page.getByText(this.pageElements.onboardingLabel).waitFor();

      await injectDataInDatabase(this.page, built.walletRows);
      await injectDataInDatabase(this.page, built.accountRows);
      await this.writeOperationsCache(built.operationRecords);

      // Block RPC before the reload so no api connects → `$expectedChainIds`
      // stays empty → `multisigOperation.$list` serves the seeded cache verbatim.
      await this.page.routeWebSocket(/.*/, (ws) => ws.close());

      await this.page.waitForTimeout(2000); // let IndexedDB writes settle

      // Reload onboarding so the app boots with the seeded wallets and hydrates
      // the operations cache; the onboarding guard then redirects to the shell.
      // (Navigating straight to a protected route full-loads into the guard
      // before wallets finish loading and gets stuck on onboarding.)
      await this.page.reload();
      await this.page.getByTestId(this.pageElements.walletButton).waitFor();

      // In-app (no full reload) navigation to the Operations view — a full load
      // would re-race the route guard while wallets are still loading.
      await this.page.evaluate(() => {
        window.location.hash = '#/operations';
      });
      await this.page.getByText(this.pageElements.inProgressSection).first().waitFor();

      return this;
    });
  }

  private async writeOperationsCache(records: BuiltData['operationRecords']): Promise<void> {
    await step('Write operations into spektr-cache', async () => {
      await this.page.evaluate(async ({ database, table, key, value }) => {
        await new Promise<void>((resolve, reject) => {
          const request = indexedDB.open(database);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction(table, 'readwrite');
            // idb-keyval store uses out-of-line keys, so the key is passed explicitly.
            tx.objectStore(table).put(value, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          };
        });
      }, records);
    });
  }

  public inProgressCount(): Locator {
    // The section header renders "In progress" followed by a count chip.
    return this.page.getByRole('button', { name: new RegExp(`${this.pageElements.inProgressSection}`) });
  }

  public operationTitle(title: string): Locator {
    return this.page.getByText(title, { exact: true });
  }

  /**
   * The list is virtualized, so titles deep in the list aren't in the DOM until
   * scrolled to. Single downward pass: at each step, tick off whichever
   * expected titles are currently rendered, then scroll; fail only if some
   * title never appears by the bottom. The viewport is resolved once (via the
   * sticky table header, which stays in the DOM) so scrolling doesn't
   * invalidate the locator.
   */
  public async expectTitlesByScrolling(titles: string[]): Promise<void> {
    await step(`Scroll the list and expect ${titles.length} operation titles`, async () => {
      const viewport = await this.listViewportHandle();

      const remaining = new Set(titles);
      await viewport.evaluate((el) => {
        el.scrollTop = 0;
      });
      await this.page.waitForTimeout(150);

      for (let i = 0; i < 200 && remaining.size > 0; i++) {
        for (const title of [...remaining]) {
          if ((await this.operationTitle(title).count()) > 0) remaining.delete(title);
        }
        if (remaining.size === 0) break;

        const moved = await viewport.evaluate((el) => {
          const before = el.scrollTop;
          el.scrollTop = Math.min(el.scrollTop + el.clientHeight * 0.8, el.scrollHeight);
          return el.scrollTop !== before;
        });
        await this.page.waitForTimeout(60); // let the virtualizer render the new window
        if (!moved) break;
      }

      expect([...remaining], `titles never rendered: ${[...remaining].join(', ')}`).toEqual([]);
    });
  }

  /** The scrollable viewport of the operations list (via the sticky header). */
  private async listViewportHandle() {
    const handle = await this.page
      .locator('[data-radix-scroll-area-viewport]')
      .filter({ hasText: 'Submitter' })
      .first()
      .elementHandle();
    if (!handle) throw new Error('operations list viewport not found');
    return handle;
  }

  /**
   * Scrolls the whole virtualized list and, for every operation row (tracked by
   * its unique `data-operation-id`), expands it and asserts the details panel
   * rendered. Proves that **all** seeded operations parsed into distinct,
   * expandable rows — not just that each title appears somewhere — and leaves
   * the details visible for inspection. Returns the number of rows processed.
   */
  public async expandEachOperation(expectedCount: number): Promise<number> {
    return step(`Expand and verify details for all ${expectedCount} operations`, async () => {
      const viewport = await this.listViewportHandle();
      await viewport.evaluate((el) => {
        el.scrollTop = 0;
      });
      await this.page.waitForTimeout(150);

      const processed = new Set<string>();
      for (let step = 0; step < 500 && processed.size < expectedCount; step++) {
        const rows = this.page.locator('[data-operation-id]');
        const count = await rows.count();

        let expandedOne = false;
        for (let i = 0; i < count; i++) {
          const id = await rows.nth(i).getAttribute('data-operation-id');
          if (!id || processed.has(id)) continue;

          // Re-locate by id (not positional): expanding a row shifts the DOM, so
          // `nth(i)` would drift to a different element for the details check.
          const row = this.page.locator(`[data-operation-id="${id}"]`);
          if (!(await row.isVisible().catch(() => false))) continue;

          // Toggle via the row's own accordion button (focus + Enter) — avoids
          // hitting nested action buttons or copyable identicons by position.
          await row.locator('button').first().press('Enter');
          // The expanded panel always renders a "Details" section (incl. special cards).
          await expect(row.getByText('Details', { exact: true }).first()).toBeVisible({ timeout: 5000 });
          processed.add(id);
          expandedOne = true;
          break; // re-fetch: expanding shifts the rows below
        }

        if (expandedOne) continue;

        const moved = await viewport.evaluate((el) => {
          const before = el.scrollTop;
          el.scrollTop = Math.min(el.scrollTop + el.clientHeight * 0.5, el.scrollHeight);
          return el.scrollTop !== before;
        });
        await this.page.waitForTimeout(60);
        if (!moved) break;
      }

      expect(processed.size, `expanded ${processed.size} of ${expectedCount} operations`).toBe(expectedCount);
      return processed.size;
    });
  }

  public async expectInProgressVisible(): Promise<void> {
    await step('Expect the In progress section to be present', async () => {
      await expect(this.inProgressCount().first()).toBeVisible();
    });
  }

  /**
   * The Pending tab count equals the number of seeded operations — the whole
   * batch (regular + flexible for every family) is present, which is our proof
   * that both multisig kinds render.
   */
  public async expectPendingCount(count: number): Promise<void> {
    await step(`Expect the Pending tab count to be ${count}`, async () => {
      await expect(this.page.getByRole('tab', { name: new RegExp(`Pending\\s*${count}`) })).toBeVisible();
    });
  }

  public operationRow(operationId: string): Locator {
    return this.page.locator(`[data-operation-id="${operationId}"]`);
  }

  /**
   * An awaiting-outcome operation (removed from chain storage without a caught
   * terminal event) stays in the pending list, but instead of the signing
   * actions it renders an "Updating status" loader whose tooltip explains that
   * the final status arrives with network data.
   */
  public async expectAwaitingOutcomeOperation(operationId: string): Promise<void> {
    await step('Expect the awaiting-outcome operation to stay pending without signing actions', async () => {
      const row = this.operationRow(operationId);

      await expect(row.getByText(UPDATING_STATUS_LABEL)).toBeVisible();
      await expect(row.getByRole('button', { name: 'Approve', exact: true })).toHaveCount(0);
      await expect(row.getByRole('button', { name: 'Reject', exact: true })).toHaveCount(0);

      await row.getByText(UPDATING_STATUS_LABEL).hover();
      await expect(this.page.getByText(AWAITING_OUTCOME_TOOLTIP)).toBeVisible();
    });
  }

  // ── Drafts section ──────────────────────────────────────────────────────────

  /**
   * Seeds the local wallets/accounts, mocks the "external address book" backend
   * so the app authenticates and reports the address book healthy, then opens
   * the Operations view with the seeded drafts rendered in the Drafts section.
   *
   * The backend URL lives in `spektr-cache` (idb-keyval) exactly like the app's
   * own `persist`, so hydrating it on reload fires session recovery → the
   * mocked `GET /auth/me` → authenticated state → drafts/contacts/operations
   * fetches (all mocked). Only Asset Hub websockets are allowed through, so the
   * app connects to Asset Hub and decodes the transfer drafts to their real
   * "Transfer" title, while every other chain stays blocked to keep it fast.
   */
  public async seedDraftsAndOpen(scenario: DraftScenario): Promise<OperationsPage> {
    return step('Mock the address book, seed drafts, and open the Operations view', async () => {
      await this.mockBackend(scenario);

      // `hasEverConnected` gates the drafts section; seed it before the app boots.
      // (Successful auth also sets it, but seeding removes the ordering race.)
      await this.page.addInitScript(() => {
        window.localStorage.setItem('address-book-has-ever-connected', 'true');
      });

      await this.goto(this.pageElements.onboardingUrl);
      await this.page.getByText(this.pageElements.onboardingLabel).waitFor();

      await injectDataInDatabase(this.page, scenario.walletRows);
      await injectDataInDatabase(this.page, scenario.accountRows);
      // The persisted backend URL — hydrating it triggers session recovery.
      await this.writeCacheValue('spektr-cache', 'effector', 'address-book-backend-url', scenario.backendUrl);
      // An empty operations cache keeps the list free of live operations so only
      // the drafts section is under test.
      await this.writeCacheValue('spektr-cache', 'effector', 'multisig-operations', []);

      // Allow only Asset Hub websockets — the app connects there and decodes the
      // transfer drafts; every other chain's ws is closed so the run stays fast.
      const allowedHosts = new Set(scenario.assetHubHosts);
      await this.page.routeWebSocket(
        (url) => !allowedHosts.has(url.host),
        (ws) => ws.close(),
      );

      await this.page.waitForTimeout(2000); // let IndexedDB writes settle

      await this.page.reload();
      await this.page.getByTestId(this.pageElements.walletButton).waitFor();

      await this.page.evaluate(() => {
        window.location.hash = '#/operations';
      });
      // The first draft's description proves the section fetched and rendered.
      await this.page.getByText(scenario.expected.descriptions[0]!, { exact: true }).waitFor();

      return this;
    });
  }

  private async mockBackend(scenario: DraftScenario): Promise<void> {
    await this.routeAddressBook(scenario.backendUrl, {
      session: scenario.session,
      contacts: scenario.contacts,
      drafts: scenario.drafts,
      operations: [],
    });
  }

  /**
   * Mocks the address-book backend so the app authenticates (session recovery →
   * `GET /auth/me`), reports healthy (`GET /contacts` resolves), and serves the
   * given drafts and operation descriptions. Payloads default to empty.
   *
   * Every route is scoped to the backend **host** — matching by path alone
   * would also hijack the Vite dev server's own module URLs (e.g.
   * `/src/renderer/entities/operations/…`) and break the app load.
   */
  private async routeAddressBook(
    backendUrl: string,
    opts: { session: unknown; contacts: unknown; drafts?: unknown; operations?: unknown },
  ): Promise<void> {
    await step('Mock the address-book backend endpoints', async () => {
      const json = (body: unknown) => JSON.stringify(body);

      await this.page.route(`${backendUrl}/**`, (route) => {
        const path = new URL(route.request().url()).pathname;

        let body: unknown;
        if (path.startsWith('/auth/me')) body = opts.session;
        else if (path.startsWith('/contacts')) body = opts.contacts;
        else if (path.startsWith('/draft-operations')) body = opts.drafts ?? { data: [], total: 0 };
        else if (path.startsWith('/operations')) body = opts.operations ?? [];
        else body = {};

        return route.fulfill({ status: 200, contentType: 'application/json', body: json(body) });
      });
    });
  }

  private async writeCacheValue(database: string, table: string, key: string, value: unknown): Promise<void> {
    await step(`Write ${key} into ${database}`, async () => {
      await this.page.evaluate(
        async ({ database, table, key, value }) => {
          await new Promise<void>((resolve, reject) => {
            const request = indexedDB.open(database);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const db = request.result;
              const tx = db.transaction(table, 'readwrite');
              // idb-keyval store uses out-of-line keys, so the key is passed explicitly.
              tx.objectStore(table).put(value, key);
              tx.oncomplete = () => resolve();
              tx.onerror = () => reject(tx.error);
            };
          });
        },
        { database, table, key, value },
      );
    });
  }

  /**
   * The Drafts section renders with a count chip equal to the seeded draft
   * count.
   */
  public async expectDraftsCount(count: number): Promise<void> {
    await step(`Expect the Drafts section to show ${count} drafts`, async () => {
      await expect(
        this.page.getByRole('button', { name: new RegExp(`${DRAFTS_SECTION_TITLE}\\s*${count}`) }),
      ).toBeVisible();
    });
  }

  /**
   * Every seeded description is rendered inline in its row, and the call-data /
   * no-call-data split shows as Submit vs Add-call-data primary controls.
   */
  public async expectDraftContent(scenario: DraftScenario): Promise<void> {
    await step('Expect draft descriptions and primary controls', async () => {
      for (const description of scenario.expected.descriptions) {
        await expect(this.page.getByText(description, { exact: true })).toBeVisible();
      }

      // The no-description draft shows the italic placeholder.
      await expect(this.page.getByText('No description', { exact: true })).toBeVisible();

      await expect(this.page.getByRole('button', { name: SUBMIT_BUTTON, exact: true })).toHaveCount(
        scenario.expected.submitCount,
      );
      await expect(this.page.getByRole('button', { name: ADD_CALL_DATA_BUTTON, exact: true })).toHaveCount(
        scenario.expected.addCallDataCount,
      );
    });
  }

  /**
   * The "with call data" drafts carry a real transfer call, so once Asset Hub
   * connects they decode from "Unknown Operation" to their "Transfer" title.
   */
  public async expectDecodedTransferTitle(scenario: DraftScenario): Promise<void> {
    await step(
      `Expect ${scenario.expected.transferCount} drafts to decode to "${scenario.expected.transferTitle}"`,
      async () => {
        await expect(this.page.getByText(scenario.expected.transferTitle, { exact: true })).toHaveCount(
          scenario.expected.transferCount,
          { timeout: 60_000 }, // Asset Hub connect + metadata sync before the call decodes
        );
      },
    );
  }

  /** Expanding a draft row reveals its Details panel. */
  public async expandFirstDraftAndExpectDetails(scenario: DraftScenario): Promise<void> {
    await step('Expand the first draft row and expect its Details panel', async () => {
      const description = scenario.expected.descriptions[0]!;
      // The row's accordion button is the ancestor button carrying the description.
      const row = this.page.locator('button', { hasText: description }).first();
      await row.click();
      await expect(this.page.getByText('Details', { exact: true }).first()).toBeVisible({ timeout: 5000 });
    });
  }

  // ── Operation (non-draft) with a backend description ────────────────────────

  /**
   * Seeds a single multisig operation (with its own pre-built `transaction`, so
   * it renders offline), mocks the address book so it authenticates and serves
   * the operation's description, then opens the Operations view. RPC is blocked
   * — the operation decodes from its cached transaction, and the description
   * comes from the mocked backend keyed by the operation's id.
   */
  public async seedOperationWithDescriptionAndOpen(
    scenario: OperationWithDescriptionScenario,
  ): Promise<OperationsPage> {
    return step('Mock the address book, seed the operation, and open the Operations view', async () => {
      await this.routeAddressBook(scenario.backendUrl, {
        session: scenario.session,
        contacts: scenario.contacts,
        operations: scenario.operationDescriptions,
      });

      await this.page.addInitScript(() => {
        window.localStorage.setItem('address-book-has-ever-connected', 'true');
      });

      await this.goto(this.pageElements.onboardingUrl);
      await this.page.getByText(this.pageElements.onboardingLabel).waitFor();

      await injectDataInDatabase(this.page, scenario.walletRows);
      await injectDataInDatabase(this.page, scenario.accountRows);
      await this.writeCacheValue('spektr-cache', 'effector', 'address-book-backend-url', scenario.backendUrl);
      await this.writeOperationsCache(scenario.operationRecords);

      // Block RPC — the operation renders from its cached transaction, and the
      // description arrives over the mocked HTTP backend, not the chain.
      await this.page.routeWebSocket(/.*/, (ws) => ws.close());

      await this.page.waitForTimeout(2000); // let IndexedDB writes settle

      await this.page.reload();
      await this.page.getByTestId(this.pageElements.walletButton).waitFor();

      await this.page.evaluate(() => {
        window.location.hash = '#/operations';
      });
      await this.page.getByText(this.pageElements.inProgressSection).first().waitFor();

      return this;
    });
  }

  /**
   * The seeded operation renders with its decoded title, submitter, and the
   * backend description.
   */
  public async expectOperationWithDescription(scenario: OperationWithDescriptionScenario): Promise<void> {
    await step('Expect the operation title, submitter, and backend description', async () => {
      await expect(this.page.getByText(scenario.expected.title, { exact: true }).first()).toBeVisible();
      await expect(this.page.getByText(scenario.expected.submitter, { exact: true }).first()).toBeVisible();
      // The description is address-book data fetched from the mocked backend.
      await expect(this.page.getByText(scenario.expected.description, { exact: true }).first()).toBeVisible({
        timeout: 15_000,
      });
    });
  }
}
