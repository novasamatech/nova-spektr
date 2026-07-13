import { BN, BN_ZERO } from '@polkadot/util';
import { parse } from 'csv-parse/sync';
import { cloneDeep } from 'lodash';
import { z } from 'zod';

import { downloadFiles, nonNullable, nullable, toAccountId, validateSubstrateAddress } from '@/shared/lib/utils';
import {
  type ValidationIssue,
  type VestingScheduleRaw,
  VestingFieldError,
  VestingFieldWarning,
} from '@/domains/vesting';

import { type ValidationSchemaOptions, Step } from './types';

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
const REQUIRED_CSV_HEADERS = ['target', 'locked', 'starting_block', 'per_block'];
const OPTIONAL_CSV_HEADERS = ['unlocked_at_start_block'];
const INFO_CSV_HEADERS = ['errors', 'warnings'];
const CSV_HEADER_TO_FIELD_MAP: Record<string, string> = {
  target: 'target',
  locked: 'locked',
  starting_block: 'startingBlock',
  per_block: 'perBlock',
  unlocked_at_start_block: 'unlockedAtStartBlock',
};
const MAX_CSV_ROWS = 1000;
const MAX_ROW_SIZE = 200;

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
    unlockedAtStartBlock: safeBN().optional(),
  });
}

function createValidationSchema(options: ValidationSchemaOptions) {
  const {
    minStartingBlock,
    minVestedTransfer,
    maxVestingSchedules,
    existingVestingSchedules,
    targetOccurrences = {},
  } = options;

  return z
    .object({
      target: z
        .string()
        .refine(validateSubstrateAddress, VestingFieldError.INVALID_SS58_ADDRESS)
        .transform(toAccountId)
        .refine((accountId) => {
          const existingSchedulesCount = existingVestingSchedules[accountId] ?? 0;
          return new BN(existingSchedulesCount).lte(maxVestingSchedules);
        }, VestingFieldError.MAX_VESTING_SCHEDULES_REACHED)
        .refine((accountId) => {
          const occurrences = targetOccurrences[accountId] ?? 0;
          return occurrences <= 1;
        }, VestingFieldWarning.DUPLICATE_TARGET),

      locked: safeBN()
        .refine((bn) => bn.gte(minVestedTransfer), VestingFieldError.MIN_VESTED_TRANSFER)
        .refine((bn) => bn.lt(MAX_U128), VestingFieldError.OUT_OF_RANGE),

      startingBlock: safeBN()
        .refine((bn) => bn.gt(minStartingBlock), VestingFieldWarning.START_BLOCK_IN_PAST)
        .refine((bn) => bn.gt(BN_ZERO) && bn.lt(MAX_U32), VestingFieldError.OUT_OF_RANGE),

      perBlock: safeBN().refine((bn) => bn.gt(BN_ZERO) && bn.lt(MAX_U128), VestingFieldError.OUT_OF_RANGE),

      unlockedAtStartBlock: safeBN()
        .refine((bn) => bn.gte(minVestedTransfer), VestingFieldError.MIN_VESTED_TRANSFER)
        .refine((bn) => bn.lt(MAX_U128), VestingFieldError.OUT_OF_RANGE)
        .optional(),
    })
    .refine(
      (data) => {
        if (nonNullable(data.unlockedAtStartBlock)) {
          return data.unlockedAtStartBlock.lte(data.locked);
        }
        return true;
      },
      {
        message: VestingFieldError.OUT_OF_RANGE,
        path: ['unlockedAtStartBlock'],
      },
    )
    .refine(
      (data) => {
        if (nonNullable(data.unlockedAtStartBlock)) {
          const remainingLocked = data.locked.sub(data.unlockedAtStartBlock);
          return remainingLocked.gte(minVestedTransfer);
        }
        return true;
      },
      {
        message: VestingFieldError.CLIFF_MIN_VESTED_TRANSFER,
        path: ['locked'],
      },
    );
}

function isFieldError(value: unknown): value is VestingFieldError {
  return typeof value === 'string' && Object.values(VestingFieldError).includes(value as VestingFieldError);
}

function isFieldWarning(value: unknown): value is VestingFieldWarning {
  return typeof value === 'string' && Object.values(VestingFieldWarning).includes(value as VestingFieldWarning);
}

type ParseResult = { success: true; data: VestingScheduleRaw[] } | { success: false };
async function parseCSV(file: File): Promise<ParseResult> {
  try {
    const fileContent = await file.text();

    const headerCheck = parse(fileContent, {
      to: 1,
      trim: true,
      comment: '#',
      skip_empty_lines: true,
      max_record_size: MAX_ROW_SIZE,
    });

    const parsedHeaders = headerCheck[0];
    if (!parsedHeaders || parsedHeaders.length === 0) {
      throw new Error('Invalid or missing headers.');
    }

    const normalizedHeaders = parsedHeaders.map((h: string) => h.toLowerCase());
    const allValidHeaders = [...REQUIRED_CSV_HEADERS, ...OPTIONAL_CSV_HEADERS, ...INFO_CSV_HEADERS].map((h) =>
      h.toLowerCase(),
    );

    const missingRequiredHeaders = REQUIRED_CSV_HEADERS.filter(
      (requiredHeader) => !normalizedHeaders.includes(requiredHeader.toLowerCase()),
    );

    if (missingRequiredHeaders.length > 0) {
      throw new Error(
        `Missing required headers: ${missingRequiredHeaders.join(', ')}. Found headers: ${parsedHeaders.join(', ')}`,
      );
    }

    const ignoredHeadersLower = INFO_CSV_HEADERS.map((h) => h.toLowerCase());
    const unknownHeaders = normalizedHeaders.filter(
      (header) => !allValidHeaders.includes(header) && !ignoredHeadersLower.includes(header),
    );

    if (unknownHeaders.length > 0) {
      throw new Error(`Unknown headers: ${unknownHeaders.join(', ')}`);
    }

    const data = parse<VestingScheduleRaw>(fileContent, {
      columns: (headers) => headers.map((header) => CSV_HEADER_TO_FIELD_MAP[header.toLowerCase()]),
      skip_empty_lines: true,
      comment: '#',
      trim: true,
      to: MAX_CSV_ROWS + 1,
      max_record_size: MAX_ROW_SIZE,
      cast: (value) => {
        return value === '' ? undefined : value;
      },
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
  const targetOccurrences: Record<string, number> = {};

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const rowIndex = i + 1;

    const targetAccountId = toAccountId(record?.target ?? '');

    targetOccurrences[targetAccountId] = (targetOccurrences[targetAccountId] ?? 0) + 1;
    validationOptions.targetOccurrences = targetOccurrences;

    const schedulesToAdd = nonNullable(record?.unlockedAtStartBlock) ? 2 : 1;
    if (nullable(validationOptions.existingVestingSchedules[targetAccountId])) {
      validationOptions.existingVestingSchedules[targetAccountId] = schedulesToAdd;
    } else {
      validationOptions.existingVestingSchedules[targetAccountId] += schedulesToAdd;
    }

    try {
      const schema = createValidationSchema(validationOptions);
      schema.parse(record);
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
  const columns = [...REQUIRED_CSV_HEADERS, ...OPTIONAL_CSV_HEADERS, 'errors', 'warnings'];
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

    return [
      row.target,
      row.locked,
      row.startingBlock,
      row.perBlock,
      row.unlockedAtStartBlock ?? '',
      errorMessages,
      warningMessages,
    ].join(',');
  });

  const csvContent = [header, ...dataRows].join('\n');

  downloadFiles([
    {
      blob: new Blob([csvContent], { type: 'text/csv' }),
      fileName: 'vested-transfer-with-errors.csv',
    },
  ]);
}
