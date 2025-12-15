import { BN } from '@polkadot/util';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';

import { downloadFiles, toAccountId, validateAddress } from '@/shared/lib/utils';
import {
  MultiTransferCsvError,
  MultiTransferFieldError,
  type MultiTransferRowSerialized,
  type ValidationIssue,
} from '@/entities/multi-transfer';

import { type ValidationSchemaOptions } from './types';

const MAX_U128 = new BN(2).pow(new BN(128));
const CSV_HEADERS = ['recipient', 'amount'];
const CSV_FIELDS = ['recipient', 'amount'];
const MAX_CSV_ROWS = 1000;

export const multiTransferUtils = {
  parseCSV,
  createValidationSchema,
  validateCSV,
  downloadCsvWithIssues,
};

type ParseResult =
  | { success: true; data: MultiTransferRowSerialized[] }
  | { success: false; error: MultiTransferCsvError };

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
    const isHeaderValid =
      Array.isArray(parsedHeaders) &&
      parsedHeaders.length >= CSV_HEADERS.length &&
      CSV_HEADERS.every(
        (expected, index) => expected.toLowerCase().trim() === parsedHeaders[index]?.toLowerCase().trim(),
      );

    if (!isHeaderValid) {
      return { success: false, error: MultiTransferCsvError.STRUCTURE };
    }

    const data = parse<MultiTransferRowSerialized>(fileContent, {
      columns: CSV_FIELDS,
      relax_column_count_more: true,
      skip_empty_lines: true,
      comment: '#',
      trim: true,
      from: 2,
      to: MAX_CSV_ROWS + 1,
    });

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
  const { chain } = options;

  return z.object({
    recipient: z
      .string()
      .refine((value) => validateAddress(value, chain), MultiTransferFieldError.INVALID_SS58_ADDRESS)
      .transform(toAccountId),
    amount: safeBN()
      .refine((bn) => bn.gt(new BN(0)), MultiTransferFieldError.OUT_OF_RANGE)
      .refine((bn) => bn.lt(MAX_U128), MultiTransferFieldError.OUT_OF_RANGE),
  });
}

function isFieldError(value: unknown): value is MultiTransferFieldError {
  return typeof value === 'string' && Object.values(MultiTransferFieldError).includes(value as MultiTransferFieldError);
}

function validateCSV(records: MultiTransferRowSerialized[], options: ValidationSchemaOptions) {
  const issues: ValidationIssue[] = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const rowIndex = i + 1;

    try {
      const schema = createValidationSchema(options);
      schema.parse(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        for (const issue of error.issues) {
          const path = issue.path[0] as ValidationIssue['path'];
          let message: ValidationIssue['message'] = MultiTransferFieldError.UNKNOWN_ERROR;

          if (isFieldError(issue.message)) {
            message = issue.message;
          }

          issues.push({ row: rowIndex, path, severity: 'error', message });
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

  const hasErrors = issues.length > 0;

  return {
    success: !hasErrors,
    issues,
  };
}

function downloadCsvWithIssues(rows: MultiTransferRowSerialized[], issues: ValidationIssue[]) {
  const columns = [...CSV_HEADERS, 'errors'];
  const header = columns.join(',');

  const dataRows = rows.map((row, index) => {
    const rowIndex = index + 1;
    const errorMessages = issues
      .filter((issue) => issue.row === rowIndex)
      .map((error) => `${error.path}: ${error.message}`)
      .join(' | ');

    return [row.recipient, row.amount, errorMessages].join(',');
  });

  const csvContent = [header, ...dataRows].join('\n');

  downloadFiles([
    {
      blob: new Blob([csvContent], { type: 'text/csv' }),
      fileName: 'multi-transfer-with-errors.csv',
    },
  ]);
}
