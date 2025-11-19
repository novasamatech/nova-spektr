import { BN } from '@polkadot/util';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';

import { downloadFiles, toAccountId, validateAddress } from '@/shared/lib/utils';

import {
  type ErrorRecord,
  FileErrors,
  RowErrors,
  Step,
  VestingScheduleError,
  type VestingScheduleRaw,
  type VestingScheduleSchemaOptions,
} from './types';

export const vestedTransferUtils = {
  isNoneStep,
  isInitStep,
  isConfirmStep,
  isSignStep,
  isSubmitStep,

  parseCSV,
  createVestingScheduleSchema,
  validateCSV,
  downloadCSVWithErrors,
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

function createVestingScheduleSchema(options: VestingScheduleSchemaOptions) {
  const { chain, minStartingBlock, minVestedTransfer, maxVestingSchedules, existingVestingSchedules } = options;
  const positiveBn = (errorMessage: string) =>
    z
      .string()
      .refine(
        (value) => {
          try {
            const bn = new BN(value);
            return bn.gt(new BN(0));
          } catch {
            return false;
          }
        },
        { message: errorMessage },
      )
      .transform((value) => new BN(value));

  return z.object({
    target: z
      .string()
      .refine((value) => validateAddress(value, chain), RowErrors.INVALID_SS58_ADDRESS)
      .transform(toAccountId)
      .refine((accountId) => {
        const existingSchedulesCount = existingVestingSchedules[accountId]?.length ?? 0;
        return new BN(existingSchedulesCount).lt(maxVestingSchedules);
      }, RowErrors.MAX_VESTING_SCHEDULES_REACHED),

    locked: positiveBn(RowErrors.LOCKED_NOT_POSITIVE_INT).refine(
      (bn) => bn.gte(minVestedTransfer),
      RowErrors.LOCKED_TOO_LOW,
    ),

    startingBlock: positiveBn(RowErrors.START_BLOCK_NOT_POSITIVE_INT)
      .refine((bn) => bn.gt(minStartingBlock), RowErrors.START_BLOCK_IN_PAST)
      .refine((bn) => bn.lt(new BN(2 ** 32)), RowErrors.START_BLOCK_TOO_HIGH),
    perBlock: positiveBn(RowErrors.PER_BLOCK_NOT_POSITIVE_INT),
  });
}

function isVestingScheduleRowError(value: unknown): value is RowErrors {
  return typeof value === 'string' && Object.values(RowErrors).includes(value as RowErrors);
}

async function parseCSV(file: File) {
  const fileContent = await file.text();

  try {
    return parse<VestingScheduleRaw>(fileContent, {
      columns: ['target', 'locked', 'startingBlock', 'perBlock'],
      relax_column_count_more: true,
      skip_empty_lines: true,
      comment: '#',
      trim: true,
      from: 2,
      to: 1001,
    });
  } catch {
    throw new VestingScheduleError(FileErrors.INVALID_CSV_STRUCTURE);
  }
}

function validateCSV<T>(records: VestingScheduleRaw[], schema: z.ZodSchema<T>) {
  const validated: T[] = [];
  const errorMap: ErrorRecord = {};

  const addError = (rowIndex: number, error: RowErrors) => {
    if (!errorMap[rowIndex]) {
      errorMap[rowIndex] = [];
    }
    errorMap[rowIndex].push(error);
  };

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const rowIndex = i + 1;

    try {
      validated.push(schema.parse(record));
    } catch (error) {
      if (error instanceof z.ZodError) {
        for (const issue of error.issues) {
          const rowError = isVestingScheduleRowError(issue.message) ? issue.message : RowErrors.UNKNOWN_ERROR;
          addError(rowIndex, rowError);
        }
      } else {
        addError(rowIndex, RowErrors.UNKNOWN_ERROR);
      }
    }
  }

  if (Object.keys(errorMap).length > 0) {
    throw new VestingScheduleError(FileErrors.INVALID_CSV_DATA, errorMap);
  }

  return validated;
}

function downloadCSVWithErrors(vestingSchedule: VestingScheduleRaw[], errors: ErrorRecord) {
  const columns = ['target', 'locked', 'startingBlock', 'perBlock', 'errors'];
  const header = columns.join(',');

  const dataRows = vestingSchedule.map((row, index) => {
    const rowIndex = index + 1;
    const errorMessages = errors[rowIndex] ?? [];

    return [row.target, row.locked, row.startingBlock, row.perBlock, errorMessages.join(' | ')].join(',');
  });

  const csvContent = [header, ...dataRows].join('\n');

  downloadFiles([
    {
      blob: new Blob([csvContent], { type: 'text/csv' }),
      fileName: 'vested-transfer-with-errors.csv',
    },
  ]);
}
