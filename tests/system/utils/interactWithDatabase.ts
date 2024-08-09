import { type Page } from 'playwright';

export interface IndexedDBData {
  database: string;
  table: string;
  injectingData: any[];
}

/**
 * Injects data into an IndexedDB database within a given page context.
 *
 * @param {Page} page - The Playwright page context in which to operate.
 * @param {IndexedDBData} data - The data to be injected, including database
 *   name, table name, and the data itself.
 *
 * @returns {Promise<void>} A promise that resolves when the data has been
 *   successfully injected.
 */
export async function injectDataInDatabase(page: Page, data: IndexedDBData): Promise<void> {
  await page.evaluate(async (data) => {
    if (!('indexedDB' in window)) {
      console.log("This browser doesn't support IndexedDB.");
    } else {
      const { database, table, injectingData } = data;
      const dbPromise = window.indexedDB.open(database);

      while (dbPromise.readyState == 'pending') {
        await new Promise((resolve) => {
          setTimeout(resolve, 1_000);
        });
        console.log('waiting');
      }
      const tx = dbPromise.result.transaction(table, 'readwrite');
      console.log(tx);
      const store = tx.objectStore(table);
      injectingData.forEach((item) => {
        store.put(item);
      });
    }
  }, data);
}
