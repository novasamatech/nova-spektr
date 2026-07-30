import { BN } from '@polkadot/util';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { downloadFiles, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  type ValidationIssue,
  type VestingScheduleRaw,
  VestingFieldError,
  VestingFieldWarning,
} from '@/domains/vesting';

import { type ValidationSchemaOptions } from './types';
import { vestedTransferUtils } from './utils';

vi.mock('@/shared/lib/utils', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('@/shared/lib/utils')>();

  return {
    ...actual,
    downloadFiles: vi.fn(),
  };
});

const TARGET_1 = '5CGQ7BPJZZKNirQgVhzbX9wdkgbnUHtJ5V7FkMXdZeVbXyr9';
const TARGET_2 = '16ZL8yLyXv3V3L3z9ofR1ovFLziyXaN1DPq4yffMAZ9czzBD';
const TARGET_3 = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const INVALID_CHECKSUM_ADDRESS = '16fL8yLyXv3V3L3z9ofR1ovFLziyXaN1DPq4yffMAZ9czzBD';

const csvFile = (content: string) => new File([content], 'test.csv', { type: 'text/csv' });

// `parseCSV` does not convert the recipient address to a hex AccountId — it keeps the raw
// SS58 string from the file (the `AccountId` type on `VestingScheduleRaw.target` describes the
// shape after `createTransformSchema`, not what `parseCSV`/`validateCSV` actually hold). The cast
// below reflects that real runtime shape rather than pre-converting like `toAccountId` would.
const schedule = (
  target: string,
  locked: string,
  startingBlock: string,
  perBlock: string,
  unlockedAtStartBlock?: string,
): VestingScheduleRaw => {
  const base: VestingScheduleRaw = { target: target as AccountId, locked, startingBlock, perBlock };
  return unlockedAtStartBlock === undefined ? base : { ...base, unlockedAtStartBlock };
};

const baseOptions = (overrides: Partial<ValidationSchemaOptions> = {}): ValidationSchemaOptions => ({
  minStartingBlock: null,
  minVestedTransfer: new BN(1000),
  maxVestingSchedules: new BN(10),
  existingVestingSchedules: {},
  ...overrides,
});

describe('vestedTransferUtils', () => {
  describe('parseCSV', () => {
    test('parses a valid file without the cliff column', async () => {
      const file = csvFile(`target,locked,starting_block,per_block\n${TARGET_1},1000000,100,10\n`);

      const result = await vestedTransferUtils.parseCSV(file);

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toEqual([{ target: TARGET_1, locked: '1000000', startingBlock: '100', perBlock: '10' }]);
    });

    test('parses a valid file with the cliff column', async () => {
      const file = csvFile(
        `target,locked,starting_block,per_block,unlocked_at_start_block\n${TARGET_1},1000000,100,10,500\n`,
      );

      const result = await vestedTransferUtils.parseCSV(file);

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toEqual([
        {
          target: TARGET_1,
          locked: '1000000',
          startingBlock: '100',
          perBlock: '10',
          unlockedAtStartBlock: '500',
        },
      ]);
    });

    test('tolerates errors/warnings columns on re-upload of a previously annotated file', async () => {
      const file = csvFile(`target,locked,starting_block,per_block,errors,warnings\n${TARGET_1},1000000,100,10,,\n`);

      const result = await vestedTransferUtils.parseCSV(file);

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toEqual([{ target: TARGET_1, locked: '1000000', startingBlock: '100', perBlock: '10' }]);
    });

    test('returns a failure for an empty file', async () => {
      const file = csvFile('');

      const result = await vestedTransferUtils.parseCSV(file);

      expect(result).toEqual({ success: false });
    });

    test('returns zero rows for a headers-only file', async () => {
      const file = csvFile('target,locked,starting_block,per_block\n');

      const result = await vestedTransferUtils.parseCSV(file);

      expect(result).toEqual({ success: true, data: [] });
    });

    test('returns a failure when a required column is missing', async () => {
      const file = csvFile(`target,locked,starting_block\n${TARGET_1},1000000,100\n`);

      const result = await vestedTransferUtils.parseCSV(file);

      expect(result).toEqual({ success: false });
    });

    test('returns a failure for unknown columns', async () => {
      const file = csvFile(`target,locked,starting_block,per_block,note\n${TARGET_1},1000000,100,10,hi\n`);

      const result = await vestedTransferUtils.parseCSV(file);

      expect(result).toEqual({ success: false });
    });

    test('is case-insensitive and order-insensitive for headers', async () => {
      const file = csvFile(`PER_BLOCK,Target,Starting_Block,LOCKED\n10,${TARGET_1},100,1000000\n`);

      const result = await vestedTransferUtils.parseCSV(file);

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toEqual([{ target: TARGET_1, locked: '1000000', startingBlock: '100', perBlock: '10' }]);
    });

    test('skips comment lines and empty lines', async () => {
      const file = csvFile(
        `target,locked,starting_block,per_block\n# comment\n${TARGET_1},1000000,100,10\n\n${TARGET_2},2000000,200,20\n`,
      );

      const result = await vestedTransferUtils.parseCSV(file);

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toHaveLength(2);
    });

    test('rejects duplicate target rows at the parse level only as plain duplicate rows (validated later)', async () => {
      const file = csvFile(
        `target,locked,starting_block,per_block\n${TARGET_1},1000000,100,10\n${TARGET_1},2000000,200,20\n`,
      );

      const result = await vestedTransferUtils.parseCSV(file);

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toHaveLength(2);
    });

    test('returns a failure when a record exceeds the 200-byte limit', async () => {
      const hugeLocked = '9'.repeat(250);
      const file = csvFile(`target,locked,starting_block,per_block\n${TARGET_1},${hugeLocked},100,10\n`);

      const result = await vestedTransferUtils.parseCSV(file);

      expect(result).toEqual({ success: false });
    });

    test('accepts exactly 1000 data rows', async () => {
      const dataRows = Array.from({ length: 1000 }, (_, index) => `addr${index},1000,100,10`).join('\n');
      const file = csvFile(`target,locked,starting_block,per_block\n${dataRows}\n`);

      const result = await vestedTransferUtils.parseCSV(file);

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toHaveLength(1000);
    });

    // Unlike multi-transfer, parseCSV has no explicit "too many rows" rejection: it caps the
    // underlying csv-parse `to` option at MAX_CSV_ROWS + 1 and silently truncates, returning
    // success with 1001 rows rather than surfacing an error. This is a real behavioural gap
    // against the README's "1000 rows" limit (see report).
    test('silently truncates to 1001 rows instead of rejecting when more rows are present', async () => {
      const dataRows = Array.from({ length: 1500 }, (_, index) => `addr${index},1000,100,10`).join('\n');
      const file = csvFile(`target,locked,starting_block,per_block\n${dataRows}\n`);

      const result = await vestedTransferUtils.parseCSV(file);

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toHaveLength(1001);
    });
  });

  describe('createValidationSchema / validateCSV', () => {
    test('accepts a well-formed row with no issues', () => {
      const records = [schedule(TARGET_1, '5000', '100', '10')];

      const result = vestedTransferUtils.validateCSV(records, baseOptions());

      expect(result).toEqual({ success: true, issues: [] });
    });

    test('flags an invalid SS58 target as INVALID_SS58_ADDRESS', () => {
      const records = [schedule(INVALID_CHECKSUM_ADDRESS, '5000', '100', '10')];

      const result = vestedTransferUtils.validateCSV(records, baseOptions());

      expect(result.success).toBe(false);
      expect(result.issues).toContainEqual({
        row: 1,
        path: 'target',
        severity: 'error',
        message: VestingFieldError.INVALID_SS58_ADDRESS,
      });
    });

    test('flags locked below the chain minimum as MIN_VESTED_TRANSFER', () => {
      const records = [schedule(TARGET_1, '10', '100', '10')];

      const result = vestedTransferUtils.validateCSV(records, baseOptions({ minVestedTransfer: new BN(1000) }));

      expect(result.success).toBe(false);
      expect(result.issues).toContainEqual({
        row: 1,
        path: 'locked',
        severity: 'error',
        message: VestingFieldError.MIN_VESTED_TRANSFER,
      });
    });

    test('flags a non-numeric field as INVALID_VALUE', () => {
      const records = [schedule(TARGET_1, 'not-a-number', '100', '10')];

      const result = vestedTransferUtils.validateCSV(records, baseOptions());

      expect(result.success).toBe(false);
      expect(result.issues).toContainEqual({
        row: 1,
        path: 'locked',
        severity: 'error',
        message: VestingFieldError.INVALID_VALUE,
      });
    });

    test('flags a duplicate target as a warning, not an error', () => {
      const records = [schedule(TARGET_1, '5000', '100', '10'), schedule(TARGET_1, '6000', '200', '20')];

      const result = vestedTransferUtils.validateCSV(records, baseOptions());

      expect(result.success).toBe(true);
      expect(result.issues).toEqual([
        { row: 2, path: 'target', severity: 'warning', message: VestingFieldWarning.DUPLICATE_TARGET },
      ]);
    });

    test('flags MAX_VESTING_SCHEDULES_REACHED when existing schedules already fill the quota', () => {
      const targetId = toAccountId(TARGET_1);
      const records = [schedule(TARGET_1, '5000', '100', '10')];

      const result = vestedTransferUtils.validateCSV(
        records,
        baseOptions({ maxVestingSchedules: new BN(1), existingVestingSchedules: { [targetId]: 1 } }),
      );

      expect(result.success).toBe(false);
      expect(result.issues).toContainEqual({
        row: 1,
        path: 'target',
        severity: 'error',
        message: VestingFieldError.MAX_VESTING_SCHEDULES_REACHED,
      });
    });

    test('a cliff row consumes two schedule slots against the max-schedules limit', () => {
      const targetId = toAccountId(TARGET_1);
      // maxVestingSchedules = 2: a plain row (1 slot) would pass, but a cliff row (2 slots) must fail
      // when 1 schedule already exists for the target.
      const cliffRecord = [schedule(TARGET_1, '5000', '100', '10', '1000')];

      const result = vestedTransferUtils.validateCSV(
        cliffRecord,
        baseOptions({ maxVestingSchedules: new BN(2), existingVestingSchedules: { [targetId]: 1 } }),
      );

      expect(result.success).toBe(false);
      expect(result.issues).toContainEqual({
        row: 1,
        path: 'target',
        severity: 'error',
        message: VestingFieldError.MAX_VESTING_SCHEDULES_REACHED,
      });
    });

    test('a non-cliff row only consumes a single schedule slot', () => {
      const targetId = toAccountId(TARGET_1);
      const plainRecord = [schedule(TARGET_1, '5000', '100', '10')];

      const result = vestedTransferUtils.validateCSV(
        plainRecord,
        baseOptions({ maxVestingSchedules: new BN(2), existingVestingSchedules: { [targetId]: 1 } }),
      );

      expect(result.success).toBe(true);
    });

    test('flags a past starting_block as a warning, not an error, when judged against the timeline chain head', () => {
      const records = [schedule(TARGET_1, '5000', '50', '10')];

      const result = vestedTransferUtils.validateCSV(records, baseOptions({ minStartingBlock: new BN(100) }));

      expect(result.success).toBe(true);
      expect(result.issues).toEqual([
        { row: 1, path: 'startingBlock', severity: 'warning', message: VestingFieldWarning.START_BLOCK_IN_PAST },
      ]);
    });

    test('skips the past-block check entirely when minStartingBlock is null', () => {
      const records = [schedule(TARGET_1, '5000', '1', '10')];

      const result = vestedTransferUtils.validateCSV(records, baseOptions({ minStartingBlock: null }));

      expect(result.success).toBe(true);
      expect(result.issues).toEqual([]);
    });

    test('accepts a cliff row where both the cliff and the remainder clear the chain minimum', () => {
      const records = [schedule(TARGET_1, '5000', '100', '10', '2000')];

      const result = vestedTransferUtils.validateCSV(records, baseOptions({ minVestedTransfer: new BN(1000) }));

      expect(result).toEqual({ success: true, issues: [] });
    });

    test('flags a cliff exceeding locked as OUT_OF_RANGE on unlockedAtStartBlock', () => {
      const records = [schedule(TARGET_1, '1000', '100', '10', '2000')];

      const result = vestedTransferUtils.validateCSV(records, baseOptions({ minVestedTransfer: new BN(100) }));

      expect(result.success).toBe(false);
      expect(result.issues).toContainEqual({
        row: 1,
        path: 'unlockedAtStartBlock',
        severity: 'error',
        message: VestingFieldError.OUT_OF_RANGE,
      });
    });

    test('flags a cliff whose remainder falls below the chain minimum as CLIFF_MIN_VESTED_TRANSFER', () => {
      // locked=1000, cliff=900 -> remainder=100, below minVestedTransfer=200.
      const records = [schedule(TARGET_1, '1000', '100', '10', '900')];

      const result = vestedTransferUtils.validateCSV(records, baseOptions({ minVestedTransfer: new BN(200) }));

      expect(result.success).toBe(false);
      expect(result.issues).toContainEqual({
        row: 1,
        path: 'locked',
        severity: 'error',
        message: VestingFieldError.CLIFF_MIN_VESTED_TRANSFER,
      });
    });
  });

  // Note: `isFieldError`/`isFieldWarning` are declared in utils.ts but, unlike multi-transfer,
  // are neither exported individually nor included in the `vestedTransferUtils` object — they
  // are unreachable from outside the module. Their severity-mapping behaviour is exercised
  // indirectly above (every validateCSV assertion on `severity: 'error' | 'warning'`).

  describe('downloadCsvWithIssues', () => {
    afterEach(() => {
      vi.mocked(downloadFiles).mockClear();
    });

    test('emits an errors/warnings-annotated CSV preserving row order', () => {
      const rows = [
        schedule(TARGET_1, '5000', '100', '10'),
        schedule(TARGET_2, '10', '200', '20'),
        schedule(TARGET_3, '6000', '300', '30', '1000'),
      ];
      const issues: ValidationIssue[] = [
        { row: 2, path: 'locked', severity: 'error', message: VestingFieldError.MIN_VESTED_TRANSFER },
        { row: 3, path: 'target', severity: 'warning', message: VestingFieldWarning.DUPLICATE_TARGET },
      ];

      vestedTransferUtils.downloadCsvWithIssues(rows, issues);

      expect(downloadFiles).toHaveBeenCalledTimes(1);
      const file = vi.mocked(downloadFiles).mock.calls[0]?.[0]?.[0];
      if (!file) throw new Error('downloadFiles was not called with a file');
      expect(file.fileName).toBe('vested-transfer-with-errors.csv');

      return file.blob.text().then((csvContent: string) => {
        const lines = csvContent.split('\n');
        expect(lines[0]).toBe('target,locked,starting_block,per_block,unlocked_at_start_block,errors,warnings');
        expect(lines[1]).toBe(`${TARGET_1},5000,100,10,,,`);
        expect(lines[2]).toBe(`${TARGET_2},10,200,20,,locked: ${VestingFieldError.MIN_VESTED_TRANSFER},`);
        expect(lines[3]).toBe(`${TARGET_3},6000,300,30,1000,,target: ${VestingFieldWarning.DUPLICATE_TARGET}`);
      });
    });
  });
});
