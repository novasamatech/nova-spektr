import { type Locator, expect } from '@playwright/test';
import { step } from 'allure-js-commons';

import { type BuiltData } from '../../utils/buildMultisigOperations';
import { injectDataInDatabase } from '../../utils/interactWithDatabase';
import { BasePage } from '../BasePage';
import { type OperationsPageElements } from '../_elements/OperationsPageElements';

export class OperationsPage extends BasePage<OperationsPageElements> {
  /**
   * Seeds the multisig/flexible wallets + accounts (Dexie `spektr`) and the
   * operations cache (`spektr-cache` → `effector` key `multisig-operations`),
   * blocks all RPC websockets so the live subscription never overwrites the
   * seeded cache, then opens the Operations view.
   */
  public async seedAndOpen(built: BuiltData): Promise<OperationsPage> {
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
      const viewport = await this.page
        .locator('[data-radix-scroll-area-viewport]')
        .filter({ hasText: 'Submitter' })
        .first()
        .elementHandle();
      if (!viewport) throw new Error('operations list viewport not found');

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
}
