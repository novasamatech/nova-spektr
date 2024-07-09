import { Page } from 'playwright';
import { expect } from '@playwright/test';

import { BasePage } from '../BasePage';
import { BasketPageElements } from '../_elements/BasketPageElements';
import { IndexedDBData, injectDataInDatabase } from '../../utils/interactWithDatabase';
import { createStakingOperations, createTransferOperations, createProxyOperations } from '../../data/db/basket';

export class BaseBasketPage extends BasePage {
  protected pageElements: BasketPageElements;

  constructor(page: Page, pageElements: BasketPageElements) {
    super(page);
    this.pageElements = pageElements;
  }

  public async addStakingOperationsIntoBasket(): Promise<void> {
    const operations = createStakingOperations(
      1,
      '5Cad3FdyS4j4z39uzTPhcPFey5MNXEszCCTTfkH6Ly1LsFwz',
      '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e',
    );
    await this.injectBasketOperationsInDatabase(operations);
  }

  public async addTransferOperationsIntoBasket(): Promise<void> {
    const operations = createTransferOperations(
      1,
      '5Cad3FdyS4j4z39uzTPhcPFey5MNXEszCCTTfkH6Ly1LsFwz',
      '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e',
    );
    await this.injectBasketOperationsInDatabase(operations);
  }

  public async addProxyOperationsIntoBasket(): Promise<void> {
    const operations = createProxyOperations(
      1,
      '5Cad3FdyS4j4z39uzTPhcPFey5MNXEszCCTTfkH6Ly1LsFwz',
      '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e',
    );
    await this.injectBasketOperationsInDatabase(operations);
  }

  private async injectBasketOperationsInDatabase(operations: IndexedDBData): Promise<void> {
    await injectDataInDatabase(this.page, operations);

    await this.page.waitForTimeout(2000); // waiting for database update
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');

    const shimmerElements = this.page.locator(this.pageElements.shimmeringAtribute);
    await expect(shimmerElements, 'On the Basket page has shimmering elements').toHaveCount(0);
  }
}
