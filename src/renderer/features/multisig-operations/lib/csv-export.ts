import { type Chain, type ChainId, type DecodedTransaction } from '@/shared/core';
import { type MultisigEvent, type MultisigOperation } from '@/domains/network';
import { operationDetailsUtils } from '@/entities/operations';

import { extractTransferAmount } from './transfer-amount-extractor';

const CSV_COLUMNS = [
  'timestamp',
  'explorer_url',
  'status',
  'chain_name',
  'multisig_account',
  'depositor',
  'method',
  'section',
  'transaction_type',
  'amount',
  'amount_raw',
  'asset_symbol',
  'recipient',
  'call_hash',
  'call_data',
  'transaction_args_json',
  'approvals_count',
  'rejections_count',
  'events_json',
] as const;

type CsvRow = Record<(typeof CSV_COLUMNS)[number], string>;

type CsvExportContext = {
  chains: Record<ChainId, Chain>;
};

export const formatTimestampISO = (timestamp: number): string => {
  return new Date(timestamp).toISOString();
};

const escapeCsvValue = (value: string): string => {
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const serializeEventsToJson = (events: MultisigEvent[]): string => {
  const serialized = events.map(event => ({
    id: event.id,
    accountId: event.accountId,
    status: event.status,
    timestamp: formatTimestampISO(event.timestamp),
    blockCreated: event.blockCreated,
    indexCreated: event.indexCreated,
    extrinsicHash: event.extrinsicHash ?? null,
  }));

  return JSON.stringify(serialized);
};

const serializeTransactionArgsToJson = (transaction: DecodedTransaction | null): string => {
  if (!transaction?.args) return '';

  try {
    const serializableArgs = JSON.parse(
      JSON.stringify(transaction.args, (_key, value) => {
        if (value && typeof value === 'object' && value.constructor?.name === 'BN') {
          return value.toString();
        }
        if (typeof value === 'bigint') {
          return value.toString();
        }
        return value;
      }),
    );

    return JSON.stringify(serializableArgs);
  } catch {
    return '';
  }
};

const countEventsByStatus = (events: MultisigEvent[], status: 'approve' | 'reject'): number => {
  return events.filter(e => e.status === status).length;
};

export const serializeOperationToCsvRow = (operation: MultisigOperation, context: CsvExportContext): CsvRow => {
  const chain = context.chains[operation.chainId];
  const explorerUrl = operationDetailsUtils.getMultisigExtrinsicLink(
    operation.callHash,
    operation.indexCreated,
    operation.blockCreated,
    chain?.explorers,
  );

  // Extract transfer amount information if applicable
  const transferInfo = extractTransferAmount(operation, chain ?? null);

  return {
    timestamp: formatTimestampISO(operation.timestamp),
    explorer_url: explorerUrl ?? '',
    status: operation.status,
    chain_name: chain?.name ?? '',
    multisig_account: operation.accountId,
    depositor: operation.depositor,
    method: operation.method ?? '',
    section: operation.section ?? '',
    transaction_type: operation.transaction?.type ?? '',
    amount: transferInfo?.formattedAmount ?? '',
    amount_raw: transferInfo?.rawAmount ?? '',
    asset_symbol: transferInfo?.assetSymbol ?? '',
    recipient: transferInfo?.recipientAddress ?? '',
    call_hash: operation.callHash,
    call_data: operation.callData ?? '',
    transaction_args_json: serializeTransactionArgsToJson(operation.transaction),
    approvals_count: countEventsByStatus(operation.events, 'approve').toString(),
    rejections_count: countEventsByStatus(operation.events, 'reject').toString(),
    events_json: serializeEventsToJson(operation.events),
  };
};

const generateCsvHeader = (): string => {
  return CSV_COLUMNS.join(',');
};

const generateCsvDataRow = (row: CsvRow): string => {
  return CSV_COLUMNS.map(col => escapeCsvValue(row[col])).join(',');
};

export const generateCsv = (operations: MultisigOperation[], context: CsvExportContext): string => {
  const header = generateCsvHeader();

  // Sort operations by timestamp descending (most recent first)
  const sortedOperations = [...operations].sort((a, b) => b.timestamp - a.timestamp);

  const rows = sortedOperations.map(op => generateCsvDataRow(serializeOperationToCsvRow(op, context)));

  // UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';

  return BOM + [header, ...rows].join('\n');
};

export const generateExportFilename = (operationsCount: number, tab: string): string => {
  const date = new Date().toISOString().split('T')[0];

  return `multisig-operations-${tab}-${date}-${operationsCount}-items.csv`;
};

export const createCsvBlob = (csvContent: string): Blob => {
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
};
