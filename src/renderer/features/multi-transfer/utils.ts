import { BN } from '@polkadot/util';
import { parse } from 'csv-parse/sync';
import { cloneDeep } from 'lodash';
import { z } from 'zod';

import { type Chain } from '@/shared/core';
import { downloadFiles, toAccountId, validateAddress } from '@/shared/lib/utils';
import { merge } from '@/shared/lib/utils/arrays';
import { totalAmountBN } from '@/shared/lib/utils/balance';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  type MultiTransferRowSerialized,
  type ValidationIssue,
  MultiTransferCsvError,
  MultiTransferFieldError,
  MultiTransferFieldWarning,
} from '@/entities/multi-transfer';

import { type ValidationSchemaOptions, Step } from './types';

const MAX_U128 = new BN(2).pow(new BN(128));
const CSV_HEADERS = ['recipient', 'amount'];
const CSV_FIELDS = ['recipient', 'amount'];
const MAX_CSV_ROWS = 1000;

export const multiTransferUtils = {
  isNoneStep,
  isInitStep,
  isConfirmStep,
  isSignStep,
  isSubmitStep,

  parseCSV,
  createValidationSchema,
  validateCSV,
  downloadCsvWithIssues,
  parseRecipientField,
  parseAmountField,
  getIssueKey,
  mergeValidationIssues,
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

type ParseResult =
  | { success: true; data: MultiTransferRowSerialized[] }
  | { success: false; error: MultiTransferCsvError };

async function parseCSV(file: File): Promise<ParseResult> {
  try {
    const fileContent = await file.text();

    const headerCheck = parse(fileContent, {
      to: 1,
      trim: true,
      comment: '#',
      skip_empty_lines: true,
    });

    const parsedHeaders = headerCheck[0];
    const isHeaderValid =
      Array.isArray(parsedHeaders) &&
      parsedHeaders.length >= CSV_HEADERS.length &&
      CSV_HEADERS.every(
        (expected, index) => expected.toLowerCase().trim() === parsedHeaders[index]?.toLowerCase().trim(),
      );

    if (!isHeaderValid) {
      return { success: false, error: MultiTransferCsvError.STRUCTURE };
    }

    const rawData = parse<{ recipient: string; amount: string }>(fileContent, {
      columns: CSV_FIELDS,
      relax_column_count_more: true,
      skip_empty_lines: true,
      comment: '#',
      trim: true,
      from: 2,
      to: MAX_CSV_ROWS + 1,
    });

    const data: MultiTransferRowSerialized[] = rawData.map((row) => ({
      recipient: {
        raw: row.recipient,
        parsed: null,
      },
      amount: {
        raw: row.amount,
        parsed: null,
      },
    }));

    return { success: true, data };
  } catch (error) {
    console.error('multi-transfer CSV parsing error:', error);
    return { success: false, error: MultiTransferCsvError.DATA };
  }
}

const safeBN = () =>
  z.string().transform((value, ctx) => {
    try {
      return new BN(value);
    } catch {
      ctx.addIssue({
        code: 'custom',
        message: MultiTransferFieldError.INVALID_VALUE,
      });
      return z.NEVER;
    }
  });

function createValidationSchema(options: ValidationSchemaOptions) {
  const { chain, recipientOccurrences = {} } = options;

  return z.object({
    recipient: z
      .string()
      .refine((value) => validateAddress(value, chain), MultiTransferFieldError.INVALID_SS58_ADDRESS)
      .transform(toAccountId)
      .refine((accountId) => {
        const occurrences = recipientOccurrences[accountId] ?? 0;
        return occurrences <= 1;
      }, MultiTransferFieldWarning.DUPLICATE_RECIPIENT),
    amount: safeBN()
      .refine((bn) => bn.gt(new BN(0)), MultiTransferFieldError.OUT_OF_RANGE)
      .refine((bn) => bn.lt(MAX_U128), MultiTransferFieldError.OUT_OF_RANGE),
  });
}

export function parseRecipientField(value: string, chain: Chain): AccountId | null {
  try {
    if (!validateAddress(value, chain)) {
      return null;
    }
    return toAccountId(value);
  } catch {
    return null;
  }
}

export function parseAmountField(value: string): BN | null {
  try {
    const bn = new BN(value);
    if (bn.gt(new BN(0)) && bn.lt(MAX_U128)) {
      return bn;
    }
    return null;
  } catch {
    return null;
  }
}

function isFieldError(value: unknown): value is MultiTransferFieldError {
  return typeof value === 'string' && Object.values(MultiTransferFieldError).includes(value as MultiTransferFieldError);
}

function isFieldWarning(value: unknown): value is MultiTransferFieldWarning {
  return (
    typeof value === 'string' && Object.values(MultiTransferFieldWarning).includes(value as MultiTransferFieldWarning)
  );
}

export function getIssueKey(issue: ValidationIssue): string {
  return `${issue.row}-${issue.path}-${issue.message}`;
}

export function mergeValidationIssues(existing: ValidationIssue[], newIssues: ValidationIssue[]): ValidationIssue[] {
  return merge({
    a: existing,
    b: newIssues,
    mergeBy: getIssueKey,
  });
}

function validateCSV(records: MultiTransferRowSerialized[], options: ValidationSchemaOptions) {
  const validationOptions = cloneDeep(options);
  const issues: ValidationIssue[] = [];
  const recipientOccurrences: Record<string, number> = {};

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const rowIndex = i + 1;

    // Build recipient occurrences map
    const recipientAccountId = toAccountId(record.recipient.raw);
    recipientOccurrences[recipientAccountId] = (recipientOccurrences[recipientAccountId] ?? 0) + 1;
    validationOptions.recipientOccurrences = recipientOccurrences;

    try {
      const schema = createValidationSchema(validationOptions);
      const parsed = schema.parse({
        recipient: record.recipient.raw,
        amount: record.amount.raw,
      });

      const recipientId = parsed.recipient;
      const amount = parsed.amount;
      const recipientBalances = options.recipientBalances;

      if (recipientBalances) {
        const balance = recipientBalances.get(recipientId);
        if (balance) {
          const totalBalance = totalAmountBN(balance);
          // If recipient has less than ED and amount is less than ED, add error
          if (totalBalance.lt(balance.ed) && amount.lt(balance.ed)) {
            issues.push({
              row: rowIndex,
              path: 'recipient',
              severity: 'error',
              message: MultiTransferFieldError.RECIPIENT_HAS_LESS_THAN_ED,
            });
          }
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        for (const issue of error.issues) {
          const path = issue.path[0] as ValidationIssue['path'];
          let severity: ValidationIssue['severity'] = 'error';
          let message: ValidationIssue['message'] = MultiTransferFieldError.UNKNOWN_ERROR;

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
          path: 'recipient',
          severity: 'error',
          message: MultiTransferFieldError.UNKNOWN_ERROR,
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

function downloadCsvWithIssues(rows: MultiTransferRowSerialized[], issues: ValidationIssue[]) {
  const columns = [...CSV_HEADERS, 'errors', 'warnings'];
  const header = columns.join(',');

  const dataRows = rows.map((row, index) => {
    const rowIndex = index + 1;
    const errorMessages = issues
      .filter((issue) => issue.row === rowIndex && issue.severity === 'error')
      .map((error) => `${error.path}: ${error.message}`)
      .join(' | ');
    const warningMessages = issues
      .filter((issue) => issue.row === rowIndex && issue.severity === 'warning')
      .map((warning) => `${warning.path}: ${warning.message}`)
      .join(' | ');

    return [row.recipient.raw, row.amount.raw, errorMessages, warningMessages].join(',');
  });

  const csvContent = [header, ...dataRows].join('\n');

  downloadFiles([
    {
      blob: new Blob([csvContent], { type: 'text/csv' }),
      fileName: 'multi-transfer-with-errors.csv',
    },
  ]);
}
