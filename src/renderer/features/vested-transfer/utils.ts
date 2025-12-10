import { BN, BN_ZERO } from '@polkadot/util';
import { parse } from 'csv-parse/sync';
import { cloneDeep } from 'lodash';
import { z } from 'zod';

import { downloadFiles, nullable, toAccountId, validateAddress } from '@/shared/lib/utils';
import {
  type ValidationIssue,
  VestingFieldError,
  VestingFieldWarning,
  type VestingScheduleRaw,
} from '@/entities/vesting';

import { Step, type ValidationSchemaOptions } from './types';

export const vestedTransferUtils = {
  isNoneStep,
  isInitStep,
  isConfirmStep,
  isSignStep,
  isSubmitStep,

  parseCSV,
  createTransformSchema,
  createValidationSchema,
  validateCSV,
  downloadCsvWithIssues,
};

function isNoneStep(step: Step): boolean {
  return step === Step.NONE;
}

function isInitStep(step: Step): boolean {
  return step === Step.INIT;
}

function isConfirmStep(step: Step): boolean {
  return step === Step.CONFIRM;
}

function isSignStep(step: Step): boolean {
  return step === Step.SIGN;
}

function isSubmitStep(step: Step): boolean {
  return step === Step.SUBMIT;
}

const MAX_U32 = new BN(2).pow(new BN(32));
const MAX_U128 = new BN(2).pow(new BN(128));
const CSV_HEADERS = ['target', 'locked', 'starting_block', 'per_block'];
const VESTING_SCHEDULE_FIELDS = ['target', 'locked', 'startingBlock', 'perBlock'];
const MAX_CSV_ROWS = 1000;

const safeBN = () =>
  z.string().transform((value, ctx) => {
    try {
      return new BN(value);
    } catch {
      ctx.addIssue({
        code: 'custom',
        message: VestingFieldError.INVALID_VALUE,
      });
      return z.NEVER;
    }
  });

function createTransformSchema() {
  return z.object({
    target: z.string().transform(toAccountId),
    locked: safeBN(),
    startingBlock: safeBN(),
    perBlock: safeBN(),
  });
}

function createValidationSchema(options: ValidationSchemaOptions) {
  const { chain, minStartingBlock, minVestedTransfer, maxVestingSchedules, existingVestingSchedules } = options;

  return z.object({
    target: z
      .string()
      .refine((value) => validateAddress(value, chain), VestingFieldError.INVALID_SS58_ADDRESS)
      .transform(toAccountId)
      .refine((accountId) => {
        const existingSchedulesCount = existingVestingSchedules[accountId] ?? 0;
        return new BN(existingSchedulesCount).lt(maxVestingSchedules);
      }, VestingFieldError.MAX_VESTING_SCHEDULES_REACHED),

    locked: safeBN()
      .refine((bn) => bn.gte(minVestedTransfer), VestingFieldError.MIN_VESTED_TRANSFER)
      .refine((bn) => bn.lt(MAX_U128), VestingFieldError.OUT_OF_RANGE),

    startingBlock: safeBN()
      .refine((bn) => bn.gt(minStartingBlock), VestingFieldWarning.START_BLOCK_IN_PAST)
      .refine((bn) => bn.gt(BN_ZERO) && bn.lt(MAX_U32), VestingFieldError.OUT_OF_RANGE),

    perBlock: safeBN().refine((bn) => bn.gt(BN_ZERO) && bn.lt(MAX_U128), VestingFieldError.OUT_OF_RANGE),
  });
}

function isFieldError(value: unknown): value is VestingFieldError {
  return typeof value === 'string' && Object.values(VestingFieldError).includes(value as VestingFieldError);
}

function isFieldWarning(value: unknown): value is VestingFieldWarning {
  return typeof value === 'string' && Object.values(VestingFieldWarning).includes(value as VestingFieldWarning);
}

type ParseResult = { success: true; data: VestingScheduleRaw[] } | { success: false };
async function parseCSV(file: File): Promise<ParseResult> {
  const fileContent = await file.text();

  try {
    const headerCheck = parse(fileContent, {
      to: 1,
      trim: true,
      comment: '#',
      skip_empty_lines: true,
    });

    const parsedHeaders = headerCheck[0];
    if (!parsedHeaders || parsedHeaders.length < CSV_HEADERS.length) {
      throw new Error('Invalid or missing headers.');
    }

    const headersMatch = CSV_HEADERS.every(
      (expectedCol, index) => expectedCol.toLowerCase().trim() === parsedHeaders[index]?.toLowerCase().trim(),
    );

    if (!headersMatch) {
      throw new Error(`Headers don't match. Expected: ${CSV_HEADERS.join(', ')}. Got: ${parsedHeaders.join(', ')}`);
    }

    const data = parse<VestingScheduleRaw>(fileContent, {
      columns: VESTING_SCHEDULE_FIELDS,
      relax_column_count_more: true,
      skip_empty_lines: true,
      comment: '#',
      trim: true,
      from: 2,
      to: MAX_CSV_ROWS + 1,
    });
    return { success: true, data };
  } catch (error) {
    console.error('CSV parsing error:', error);
    return { success: false };
  }
}

function validateCSV(records: VestingScheduleRaw[], options: ValidationSchemaOptions) {
  const validationOptions = cloneDeep(options);
  const issues: ValidationIssue[] = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const rowIndex = i + 1;

    try {
      const schema = createValidationSchema(validationOptions);
      schema.parse(record);
      const targetAccountId = toAccountId(record.target);
      if (nullable(validationOptions.existingVestingSchedules[targetAccountId])) {
        validationOptions.existingVestingSchedules[targetAccountId] = 1;
      } else {
        validationOptions.existingVestingSchedules[targetAccountId] += 1;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        for (const issue of error.issues) {
          const path = issue.path[0] as ValidationIssue['path'];
          let severity: ValidationIssue['severity'] = 'error';
          let message: ValidationIssue['message'] = VestingFieldError.UNKNOWN_ERROR;

          if (isFieldError(issue.message)) {
            message = issue.message;
          }
          if (isFieldWarning(issue.message)) {
            severity = 'warning';
            message = issue.message;
          }

          issues.push({ row: rowIndex, path, severity, message });
        }
      } else {
        issues.push({
          row: rowIndex,
          path: 'target',
          severity: 'error',
          message: VestingFieldError.UNKNOWN_ERROR,
        });
      }
    }
  }

  const hasErrors = issues.some((issue) => issue.severity === 'error');

  return {
    success: !hasErrors,
    issues,
  };
}

function downloadCsvWithIssues(vestingSchedule: VestingScheduleRaw[], issues: ValidationIssue[]) {
  const columns = [...CSV_HEADERS, 'errors', 'warnings'];
  const header = columns.join(',');

  const dataRows = vestingSchedule.map((row, index) => {
    const rowIndex = index + 1;
    const errorMessages = issues
      .filter((issue) => issue.row === rowIndex && issue.severity === 'error')
      .map((error) => `${error.path}: ${error.message}`)
      .join(' | ');
    const warningMessages = issues
      .filter((issue) => issue.row === rowIndex && issue.severity === 'warning')
      .map((warning) => `${warning.path}: ${warning.message}`)
      .join(' | ');

    return [row.target, row.locked, row.startingBlock, row.perBlock, errorMessages, warningMessages].join(',');
  });

  const csvContent = [header, ...dataRows].join('\n');

  downloadFiles([
    {
      blob: new Blob([csvContent], { type: 'text/csv' }),
      fileName: 'vested-transfer-with-errors.csv',
    },
  ]);
}
