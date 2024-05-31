import { Page } from 'playwright';

export interface IndexedDBData {
  database: string;
  table: string;
  testData: any[];
}

export async function injectDataInDatabase(page: Page, data: IndexedDBData): Promise<void> {
  await page.evaluate(async (data) => {
    if (!('indexedDB' in window)) {
      console.log("This browser doesn't support IndexedDB.");
    } else {
      const { database, table, testData } = data;
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
      testData.forEach((item) => {
        store.put(item);
      });
    }
  }, data);
}
