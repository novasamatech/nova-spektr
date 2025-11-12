import { BN } from '@polkadot/util';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';

import { type Chain } from '@/shared/core';
import { toAccountId, validateAddress } from '@/shared/lib/utils';

import {
  Step,
  VestingScheduleError,
  type VestingScheduleErrorRecord,
  VestingScheduleFileErrors,
  type VestingScheduleRaw,
  VestingScheduleRowErrors,
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

function createVestingScheduleSchema(options: { chain: Chain; minStartingBlock: BN }) {
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
      .refine((value) => validateAddress(value, options.chain), VestingScheduleRowErrors.INVALID_SS58_ADDRESS)
      .transform(toAccountId),

    locked: positiveBn(VestingScheduleRowErrors.LOCKED_NOT_POSITIVE_INT),

    startingBlock: positiveBn(VestingScheduleRowErrors.START_BLOCK_NOT_POSITIVE_INT).refine(
      (bn) => bn.gt(options.minStartingBlock),
      VestingScheduleRowErrors.START_BLOCK_IN_PAST,
    ),

    perBlock: positiveBn(VestingScheduleRowErrors.PER_BLOCK_NOT_POSITIVE_INT),
  });
}

function isVestingScheduleRowError(value: unknown): value is VestingScheduleRowErrors {
  return (
    typeof value === 'string' && Object.values(VestingScheduleRowErrors).includes(value as VestingScheduleRowErrors)
  );
}

async function parseCSV(file: File) {
  const fileContent = await file.text();

  try {
    return parse<VestingScheduleRaw>(fileContent, {
      columns: ['target', 'locked', 'startingBlock', 'perBlock'],
      skip_empty_lines: true,
      comment: '#',
      trim: true,
      from: 2,
      to: 1001,
    });
  } catch {
    throw new VestingScheduleError(VestingScheduleFileErrors.INVALID_CSV_STRUCTURE);
  }
}

function validateCSV<T>(records: VestingScheduleRaw[], schema: z.ZodSchema<T>) {
  const validated: T[] = [];
  const errorSets: Partial<Record<VestingScheduleRowErrors, Set<number>>> = {};

  const addError = (key: VestingScheduleRowErrors, row: number) => {
    if (!errorSets[key]) {
      errorSets[key] = new Set();
    }
    errorSets[key].add(row);
  };

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const rowNumber = i + 1; // 1-based

    try {
      validated.push(schema.parse(record));
    } catch (error) {
      if (error instanceof z.ZodError) {
        for (const issue of error.issues) {
          const key = isVestingScheduleRowError(issue.message) ? issue.message : VestingScheduleRowErrors.UNKNOWN_ERROR;
          addError(key, rowNumber);
        }
      } else {
        addError(VestingScheduleRowErrors.UNKNOWN_ERROR, rowNumber);
      }
    }
  }

  const errorDetails = Object.fromEntries(
    Object.entries(errorSets).map(([key, value]) => [key, Array.from(value).sort((a, b) => a - b)]),
  ) as VestingScheduleErrorRecord;

  if (Object.keys(errorDetails).length > 0) {
    throw new VestingScheduleError(VestingScheduleFileErrors.INVALID_CSV_DATA, errorDetails);
  }

  return validated;
}
