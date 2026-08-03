import { type Locator, type Page, expect } from '@playwright/test';
import { step } from 'allure-js-commons';

// Real UI copy from `src/renderer/shared/i18n/locales/en.json`.
const CUSTOM_OPERATION_BUTTON = 'Custom operation'; // navigation.customOperationLabel
const MULTI_TRANSFER_ITEM = 'Multi-transfer'; // navigation.multiTransferLabel
const CONTINUE_BUTTON = 'Continue'; // transfer.continueButton
const PREVIEW_BUTTON = 'Preview'; // multiTransfer.parsedFile.buttons.openPreview
const PARSED_FILE_TITLE = 'Parsed file'; // multiTransfer.parsedFile.title
// multiTransfer.errors.csv.*
const STRUCTURE_ERROR_PATTERN = /contains invalid CSV structure/;
const INVALID_ADDRESS_ERROR = 'Invalid SS58 address format'; // fieldErrors.INVALID_SS58_ADDRESS

const FILE_INPUT_TEST_ID = 'file-input';
const SELECT_TEST_ID = 'Select';

/**
 * The Multi-transfer modal, reached from the sidebar "Custom operation"
 * dropdown. CSV parsing and per-row validation are fully local (chain constants
 * only), so the modal can be exercised with all RPC websockets blocked.
 */
export class MultiTransferModalWindow {
  constructor(private readonly page: Page) {}

  public async blockWebsockets(): Promise<void> {
    await step('Block all RPC websockets', async () => {
      await this.page.routeWebSocket(/.*/, (ws) => ws.close());
    });
  }

  public async openFromSidebar(): Promise<this> {
    await step('Open the Multi-transfer modal from the Custom operation dropdown', async () => {
      await this.page.getByRole('button', { name: CUSTOM_OPERATION_BUTTON }).click();
      await this.page.getByText(MULTI_TRANSFER_ITEM, { exact: true }).click();

      // The CSV input unlocks once the form auto-selects the first
      // multi-transfer-capable chain.
      await expect(this.page.getByTestId(FILE_INPUT_TEST_ID)).toBeEnabled();
    });

    return this;
  }

  /**
   * Makes sure the given network is selected — row validation (SS58 prefix,
   * planks decimals) depends on it. The first multi-transfer chain is
   * auto-selected; if it is a different one, picks the requested network in the
   * chain select.
   */
  public async ensureNetwork(chainName: string): Promise<void> {
    await step(`Ensure the "${chainName}" network is selected`, async () => {
      const networkSelect = this.page.getByRole('dialog').getByTestId(SELECT_TEST_ID).first();
      const alreadySelected = await networkSelect
        .getByText(chainName, { exact: true })
        .isVisible()
        .catch(() => false);

      if (!alreadySelected) {
        await networkSelect.click();
        await this.page.getByText(chainName, { exact: true }).last().click();
      }

      await expect(networkSelect).toContainText(chainName);
    });
  }

  /** Uploads an in-memory CSV file through the hidden file input. */
  public async uploadCsv(fileName: string, content: string): Promise<void> {
    await step(`Upload CSV file "${fileName}"`, async () => {
      await this.page.getByTestId(FILE_INPUT_TEST_ID).setInputFiles({
        name: fileName,
        mimeType: 'text/csv',
        buffer: Buffer.from(content, 'utf-8'),
      });
    });
  }

  public continueButton(): Locator {
    return this.page.getByRole('button', { name: CONTINUE_BUTTON, exact: true });
  }

  public previewButton(): Locator {
    // Not a role/name locator: the button lives inside the upload `<label>`,
    // so its computed accessible name is the whole label text, not "Preview".
    return this.page.locator('button', { hasText: PREVIEW_BUTTON });
  }

  /** Malformed file (bad/missing header columns) → inline structure error. */
  public async expectStructureError(): Promise<void> {
    await step('Expect the invalid-structure error under the file input', async () => {
      await expect(this.page.getByText(STRUCTURE_ERROR_PATTERN)).toBeVisible();
    });
  }

  /** Row-level issues render as an error alert listing each failing row. */
  public async expectInvalidAddressIssue(row: number, errorCount = 1): Promise<void> {
    await step(`Expect an invalid-address error for row ${row}`, async () => {
      // multiTransfer.errors.csv.errorTitle_one / errorTitle_other
      const errorSummary = errorCount === 1 ? `Found ${errorCount} error` : `Found ${errorCount} errors`;

      await expect(this.page.getByText(errorSummary)).toBeVisible();
      await expect(this.page.getByText(new RegExp(`Row ${row}.*${INVALID_ADDRESS_ERROR}`))).toBeVisible();
    });
  }

  public async expectContinueDisabled(): Promise<void> {
    await step('Expect the Continue button to be disabled', async () => {
      await expect(this.continueButton()).toBeDisabled();
    });
  }

  /** Opens the parsed-rows preview and verifies the row count in its title. */
  public async openPreviewAndExpectRows(rowCount: number): Promise<void> {
    await step(`Open the preview and expect ${rowCount} parsed rows`, async () => {
      await expect(this.previewButton()).toBeEnabled();
      await this.previewButton().click();

      const title = this.page.getByText(new RegExp(`${PARSED_FILE_TITLE}\\s*${rowCount}`));
      await expect(title).toBeVisible();
    });
  }

  public async expectPreviewAmount(amountText: RegExp): Promise<void> {
    await step(`Expect a parsed amount matching ${amountText}`, async () => {
      await expect(this.page.getByText(amountText).first()).toBeVisible();
    });
  }
}
