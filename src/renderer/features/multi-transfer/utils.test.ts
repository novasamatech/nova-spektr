import { BN } from '@polkadot/util';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { type Balance } from '@/shared/core';
import { downloadFiles, toAccountId } from '@/shared/lib/utils';
import { polkadotChain } from '@/shared/mocks';
import {
  type MultiTransferRowSerialized,
  type ValidationIssue,
  MultiTransferCsvError,
  MultiTransferFieldError,
  MultiTransferFieldWarning,
} from '@/entities/multi-transfer';

import { MAX_CSV_ROWS, multiTransferUtils } from './utils';

vi.mock('@/shared/lib/utils', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('@/shared/lib/utils')>();

  return {
    ...actual,
    downloadFiles: vi.fn(),
  };
});

const ADDRESS_1 = '5CGQ7BPJZZKNirQgVhzbX9wdkgbnUHtJ5V7FkMXdZeVbXyr9';
const ADDRESS_2 = '16ZL8yLyXv3V3L3z9ofR1ovFLziyXaN1DPq4yffMAZ9czzBD';
const ADDRESS_3 = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const INVALID_CHECKSUM_ADDRESS = '16fL8yLyXv3V3L3z9ofR1ovFLziyXaN1DPq4yffMAZ9czzBD';

const csvFile = (content: string) => new File([content], 'test.csv', { type: 'text/csv' });

const row = (recipient: string, amount: string): MultiTransferRowSerialized => ({
  recipient: { raw: recipient, parsed: null },
  amount: { raw: amount, parsed: null },
});

describe('multiTransferUtils', () => {
  describe('parseCSV', () => {
    test('parses valid recipient/amount rows', async () => {
      const file = csvFile(`recipient,amount\n${ADDRESS_1},1000000000000\n${ADDRESS_2},2000000000000\n`);

      const result = await multiTransferUtils.parseCSV(file);

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toEqual([row(ADDRESS_1, '1000000000000'), row(ADDRESS_2, '2000000000000')]);
    });

    test('skips comment lines starting with #', async () => {
      const file = csvFile(`recipient,amount\n# this is a comment\n${ADDRESS_1},1000000000000\n`);

      const result = await multiTransferUtils.parseCSV(file);

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toEqual([row(ADDRESS_1, '1000000000000')]);
    });

    test('skips empty lines', async () => {
      const file = csvFile(`recipient,amount\n\n${ADDRESS_1},1000000000000\n\n${ADDRESS_2},2000000000000\n\n`);

      const result = await multiTransferUtils.parseCSV(file);

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toEqual([row(ADDRESS_1, '1000000000000'), row(ADDRESS_2, '2000000000000')]);
    });

    test('handles CRLF line endings', async () => {
      const file = csvFile(`recipient,amount\r\n${ADDRESS_1},1000000000000\r\n${ADDRESS_2},2000000000000\r\n`);

      const result = await multiTransferUtils.parseCSV(file);

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toEqual([row(ADDRESS_1, '1000000000000'), row(ADDRESS_2, '2000000000000')]);
    });

    test('returns a STRUCTURE error for an empty file', async () => {
      const file = csvFile('');

      const result = await multiTransferUtils.parseCSV(file);

      expect(result).toEqual({ success: false, error: MultiTransferCsvError.STRUCTURE });
    });

    test('returns zero rows for a headers-only file', async () => {
      const file = csvFile('recipient,amount\n');

      const result = await multiTransferUtils.parseCSV(file);

      expect(result).toEqual({ success: true, data: [] });
    });

    test('returns a STRUCTURE error when a required column is missing', async () => {
      const file = csvFile(`recipient\n${ADDRESS_1}\n`);

      const result = await multiTransferUtils.parseCSV(file);

      expect(result).toEqual({ success: false, error: MultiTransferCsvError.STRUCTURE });
    });

    test('returns a STRUCTURE error when columns are out of order', async () => {
      const file = csvFile(`amount,recipient\n1000000000000,${ADDRESS_1}\n`);

      const result = await multiTransferUtils.parseCSV(file);

      expect(result).toEqual({ success: false, error: MultiTransferCsvError.STRUCTURE });
    });

    test('tolerates and ignores extra unknown columns', async () => {
      const file = csvFile(`recipient,amount,note\n${ADDRESS_1},1000000000000,payout\n`);

      const result = await multiTransferUtils.parseCSV(file);

      expect(result.success).toBe(true);
      if (!result.success) return;
      // Only the first two declared fields are captured; the extra column is dropped.
      expect(result.data).toEqual([row(ADDRESS_1, '1000000000000')]);
    });

    test('accepts exactly MAX_CSV_ROWS data rows', async () => {
      const dataRows = Array.from({ length: MAX_CSV_ROWS }, (_, index) => `addr${index},${index + 1}`).join('\n');
      const file = csvFile(`recipient,amount\n${dataRows}\n`);

      const result = await multiTransferUtils.parseCSV(file);

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toHaveLength(MAX_CSV_ROWS);
    });

    test('rejects MAX_CSV_ROWS + 1 data rows with TOO_MANY_ROWS', async () => {
      const dataRows = Array.from({ length: MAX_CSV_ROWS + 1 }, (_, index) => `addr${index},${index + 1}`).join('\n');
      const file = csvFile(`recipient,amount\n${dataRows}\n`);

      const result = await multiTransferUtils.parseCSV(file);

      expect(result).toEqual({ success: false, error: MultiTransferCsvError.TOO_MANY_ROWS });
    });
  });

  describe('createValidationSchema / validateCSV', () => {
    test('accepts well-formed rows with no issues', () => {
      const records = [row(ADDRESS_1, '1000000000000'), row(ADDRESS_2, '2000000000000')];

      const result = multiTransferUtils.validateCSV(records, { chain: polkadotChain });

      expect(result).toEqual({ success: true, issues: [] });
    });

    test('flags a malformed recipient address as INVALID_SS58_ADDRESS', () => {
      const records = [row(INVALID_CHECKSUM_ADDRESS, '1000000000000')];

      const result = multiTransferUtils.validateCSV(records, { chain: polkadotChain });

      expect(result.success).toBe(false);
      expect(result.issues).toEqual([
        { row: 1, path: 'recipient', severity: 'error', message: MultiTransferFieldError.INVALID_SS58_ADDRESS },
      ]);
    });

    test('flags a non-numeric amount as INVALID_VALUE', () => {
      const records = [row(ADDRESS_1, 'not-a-number')];

      const result = multiTransferUtils.validateCSV(records, { chain: polkadotChain });

      expect(result.success).toBe(false);
      expect(result.issues).toEqual([
        { row: 1, path: 'amount', severity: 'error', message: MultiTransferFieldError.INVALID_VALUE },
      ]);
    });

    test('flags a zero or negative amount as OUT_OF_RANGE', () => {
      const records = [row(ADDRESS_1, '0'), row(ADDRESS_2, '-5')];

      const result = multiTransferUtils.validateCSV(records, { chain: polkadotChain });

      expect(result.success).toBe(false);
      expect(result.issues).toContainEqual({
        row: 1,
        path: 'amount',
        severity: 'error',
        message: MultiTransferFieldError.OUT_OF_RANGE,
      });
      expect(result.issues).toContainEqual({
        row: 2,
        path: 'amount',
        severity: 'error',
        message: MultiTransferFieldError.OUT_OF_RANGE,
      });
    });

    test('flags an amount at or above 2^128 as OUT_OF_RANGE', () => {
      const tooLarge = new BN(2).pow(new BN(128)).toString();
      const records = [row(ADDRESS_1, tooLarge)];

      const result = multiTransferUtils.validateCSV(records, { chain: polkadotChain });

      expect(result.success).toBe(false);
      expect(result.issues).toEqual([
        { row: 1, path: 'amount', severity: 'error', message: MultiTransferFieldError.OUT_OF_RANGE },
      ]);
    });

    test('flags a duplicate recipient as a warning, not an error', () => {
      const records = [row(ADDRESS_1, '1000000000000'), row(ADDRESS_1, '2000000000000')];

      const result = multiTransferUtils.validateCSV(records, { chain: polkadotChain });

      // Warnings never block submit.
      expect(result.success).toBe(true);
      expect(result.issues).toEqual([
        { row: 2, path: 'recipient', severity: 'warning', message: MultiTransferFieldWarning.DUPLICATE_RECIPIENT },
      ]);
    });

    test('flags a recipient whose resulting balance stays below the existential deposit', () => {
      const recipientId = toAccountId(ADDRESS_1);
      const balance: Balance = {
        id: 'balance-1' as never,
        chainId: polkadotChain.chainId,
        accountId: recipientId,
        assetId: 0 as never,
        assetType: 'native' as never,
        providers: 0,
        consumers: 0,
        sufficients: 0,
        transferableMode: 'total' as never,
        free: new BN(0),
        reserved: new BN(0),
        frozen: new BN(0),
        locked: [],
        ed: new BN(1_000_000_000),
      };
      const records = [row(ADDRESS_1, '1000')];

      const result = multiTransferUtils.validateCSV(records, {
        chain: polkadotChain,
        recipientBalances: new Map([[recipientId, balance]]),
      });

      expect(result.success).toBe(false);
      expect(result.issues).toEqual([
        { row: 1, path: 'recipient', severity: 'error', message: MultiTransferFieldError.RECIPIENT_HAS_LESS_THAN_ED },
      ]);
    });

    test('does not flag ED breach when the recipient already holds enough, or the transfer alone covers it', () => {
      const recipientId = toAccountId(ADDRESS_1);
      const ed = new BN(1_000_000_000);
      const balanceAboveEd: Balance = {
        id: 'balance-1' as never,
        chainId: polkadotChain.chainId,
        accountId: recipientId,
        assetId: 0 as never,
        assetType: 'native' as never,
        providers: 0,
        consumers: 0,
        sufficients: 0,
        transferableMode: 'total' as never,
        free: ed,
        reserved: new BN(0),
        frozen: new BN(0),
        locked: [],
        ed,
      };
      const records = [row(ADDRESS_1, '1000')];

      const result = multiTransferUtils.validateCSV(records, {
        chain: polkadotChain,
        recipientBalances: new Map([[recipientId, balanceAboveEd]]),
      });

      expect(result.success).toBe(true);
      expect(result.issues).toEqual([]);
    });
  });

  describe('parseRecipientField', () => {
    test('returns the AccountId for a valid address', () => {
      expect(multiTransferUtils.parseRecipientField(ADDRESS_1, polkadotChain)).toBe(toAccountId(ADDRESS_1));
    });

    test('returns null for an invalid address', () => {
      expect(multiTransferUtils.parseRecipientField(INVALID_CHECKSUM_ADDRESS, polkadotChain)).toBeNull();
    });
  });

  describe('parseAmountField', () => {
    test('returns a BN for a valid positive amount', () => {
      const result = multiTransferUtils.parseAmountField('1000');

      expect(result).not.toBeNull();
      expect(result?.toString()).toBe('1000');
    });

    test('returns null for a zero, negative or non-numeric amount', () => {
      expect(multiTransferUtils.parseAmountField('0')).toBeNull();
      expect(multiTransferUtils.parseAmountField('-1')).toBeNull();
      expect(multiTransferUtils.parseAmountField('abc')).toBeNull();
    });

    test('returns null for an amount at or above 2^128', () => {
      const tooLarge = new BN(2).pow(new BN(128)).toString();

      expect(multiTransferUtils.parseAmountField(tooLarge)).toBeNull();
    });
  });

  describe('getIssueKey', () => {
    test('is stable for identical issues', () => {
      const issue: ValidationIssue = {
        row: 1,
        path: 'recipient',
        severity: 'error',
        message: MultiTransferFieldError.INVALID_SS58_ADDRESS,
      };

      expect(multiTransferUtils.getIssueKey(issue)).toBe(multiTransferUtils.getIssueKey({ ...issue }));
    });

    test('differs when row, path or message differ', () => {
      const base: ValidationIssue = {
        row: 1,
        path: 'recipient',
        severity: 'error',
        message: MultiTransferFieldError.INVALID_SS58_ADDRESS,
      };

      const differentRow = multiTransferUtils.getIssueKey({ ...base, row: 2 });
      const differentPath = multiTransferUtils.getIssueKey({ ...base, path: 'amount' });
      const differentMessage = multiTransferUtils.getIssueKey({
        ...base,
        message: MultiTransferFieldError.OUT_OF_RANGE,
      });
      const key = multiTransferUtils.getIssueKey(base);

      expect(differentRow).not.toBe(key);
      expect(differentPath).not.toBe(key);
      expect(differentMessage).not.toBe(key);
    });
  });

  describe('mergeValidationIssues', () => {
    test('keeps issues from both lists when keys differ', () => {
      const existing: ValidationIssue[] = [
        { row: 1, path: 'recipient', severity: 'error', message: MultiTransferFieldError.INVALID_SS58_ADDRESS },
      ];
      const incoming: ValidationIssue[] = [
        { row: 2, path: 'amount', severity: 'error', message: MultiTransferFieldError.OUT_OF_RANGE },
      ];

      const merged = multiTransferUtils.mergeValidationIssues(existing, incoming);

      expect(merged).toHaveLength(2);
      expect(merged).toEqual(expect.arrayContaining([...existing, ...incoming]));
    });

    test('replaces an existing issue that shares the same key with the incoming one', () => {
      const existing: ValidationIssue[] = [
        { row: 1, path: 'amount', severity: 'warning', message: MultiTransferFieldError.OUT_OF_RANGE },
      ];
      const incoming: ValidationIssue[] = [
        { row: 1, path: 'amount', severity: 'error', message: MultiTransferFieldError.OUT_OF_RANGE },
      ];

      const merged = multiTransferUtils.mergeValidationIssues(existing, incoming);

      expect(merged).toHaveLength(1);
      expect(merged[0]).toBe(incoming[0]);
    });

    test('returns the existing list unchanged when there are no new issues', () => {
      const existing: ValidationIssue[] = [
        { row: 1, path: 'recipient', severity: 'error', message: MultiTransferFieldError.INVALID_SS58_ADDRESS },
      ];

      const merged = multiTransferUtils.mergeValidationIssues(existing, []);

      expect(merged).toBe(existing);
    });
  });

  describe('downloadCsvWithIssues', () => {
    afterEach(() => {
      vi.mocked(downloadFiles).mockClear();
    });

    test('emits an errors/warnings-annotated CSV preserving row order', () => {
      const rows = [row(ADDRESS_1, '1000000000000'), row(ADDRESS_2, '0'), row(ADDRESS_3, '2000000000000')];
      const issues: ValidationIssue[] = [
        { row: 2, path: 'amount', severity: 'error', message: MultiTransferFieldError.OUT_OF_RANGE },
        { row: 3, path: 'recipient', severity: 'warning', message: MultiTransferFieldWarning.DUPLICATE_RECIPIENT },
      ];

      multiTransferUtils.downloadCsvWithIssues(rows, issues);

      expect(downloadFiles).toHaveBeenCalledTimes(1);
      const file = vi.mocked(downloadFiles).mock.calls[0]?.[0]?.[0];
      if (!file) throw new Error('downloadFiles was not called with a file');
      expect(file.fileName).toBe('multi-transfer-with-errors.csv');

      return file.blob.text().then((csvContent: string) => {
        const lines = csvContent.split('\n');
        expect(lines[0]).toBe('recipient,amount,errors,warnings');
        expect(lines[1]).toBe(`${ADDRESS_1},1000000000000,,`);
        expect(lines[2]).toBe(`${ADDRESS_2},0,amount: ${MultiTransferFieldError.OUT_OF_RANGE},`);
        expect(lines[3]).toBe(
          `${ADDRESS_3},2000000000000,,recipient: ${MultiTransferFieldWarning.DUPLICATE_RECIPIENT}`,
        );
      });
    });
  });
});
