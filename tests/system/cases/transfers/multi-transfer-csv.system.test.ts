import { MultiTransferModalWindow } from '../../pages/modals/MultiTransferModalWindow';
import { setupTestMetadata, test } from '../../utils/baseRegularFixture';
import { transferConstants } from '../../utils/transferTestCases';

const feature = 'Transfers';
const story = 'Multi-transfer CSV upload';

const NETWORK = 'Polkadot Asset Hub';

// Any valid SS58 addresses work — the CSV validator accepts every substrate
// encoding and re-encodes with the chain prefix. The two recipients must be
// *distinct public keys*: every address in the shared test data
// (BaseTestConfig / transferTestCases) decodes to the same key, and a repeated
// recipient raises a duplicate warning.
const RECIPIENT_A = '5EpsavEfPSZC8X2E4zHdJdepzpzfSccqNP5RUVyAU9Hyi3z4'; // shared test address
const RECIPIENT_B = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'; // well-known dev key (Alice)

// Amounts are planks (DOT has 10 decimals): 2.5 DOT and 1 DOT.
const VALID_CSV = `recipient,amount\n${RECIPIENT_A},25000000000\n${RECIPIENT_B},10000000000\n`;
// Header is missing the `amount` column entirely.
const MISSING_COLUMN_CSV = `recipient\n${RECIPIENT_A}\n`;
// Structurally fine, but row 1 carries a malformed address.
const BAD_ADDRESS_CSV = `recipient,amount\nnot-a-valid-address,10000000000\n`;

/**
 * CSV parsing and row validation are local (chain constants only), so the whole
 * flow runs hermetically: RPC websockets are blocked, the wallets come from the
 * shared transfers database dump.
 */
test.describe('Multi-transfer — CSV upload validation', { tag: ['@regress'] }, () => {
  test.beforeEach(async () => {
    await setupTestMetadata(feature, story);
  });

  test('invalid CSV files surface errors and block Continue', async ({ page, loginPage, assetsPage }) => {
    test.setTimeout(180_000);

    const modal = new MultiTransferModalWindow(page);
    await modal.blockWebsockets();

    await loginPage.importDatabase('transfers/transfers_tests_db.json');
    const walletModal = await assetsPage.openWalletManagement();
    await walletModal.searchAndSelectWallet(transferConstants.vault_name);

    await modal.openFromSidebar();
    await modal.ensureNetwork(NETWORK);

    // A file without the required `amount` column is rejected as malformed.
    await modal.uploadCsv('missing-column.csv', MISSING_COLUMN_CSV);
    await modal.expectStructureError();
    await modal.expectContinueDisabled();

    // A structurally valid file with a bad address produces a row-level error
    // alert; errors block submission.
    await modal.uploadCsv('bad-address.csv', BAD_ADDRESS_CSV);
    await modal.expectInvalidAddressIssue(1);
    await modal.expectContinueDisabled();
  });

  test('valid CSV parses into preview rows', async ({ page, loginPage, assetsPage }) => {
    test.setTimeout(180_000);

    const modal = new MultiTransferModalWindow(page);
    await modal.blockWebsockets();

    await loginPage.importDatabase('transfers/transfers_tests_db.json');
    const walletModal = await assetsPage.openWalletManagement();
    await walletModal.searchAndSelectWallet(transferConstants.vault_name);

    await modal.openFromSidebar();
    await modal.ensureNetwork(NETWORK);

    await modal.uploadCsv('payouts.csv', VALID_CSV);

    // Both rows parsed: the preview shows them with plank amounts rendered in
    // the chain's native token.
    await modal.openPreviewAndExpectRows(2);
    await modal.expectPreviewAmount(/2\.5\s*DOT/);
    await modal.expectPreviewAmount(/\b1\s*DOT/);
  });
});
