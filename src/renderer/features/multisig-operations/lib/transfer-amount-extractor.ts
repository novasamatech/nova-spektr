import { type Asset, type Chain, type DecodedTransaction, TransactionType } from '@/shared/core';
import { fromPrecision, getAssetById, getNativeAsset, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type MultisigOperation } from '@/domains/network';
import {
  TransferTypes,
  XcmTypes,
  findCoreTransaction,
  getTransactionAmount,
  getXcmTransactionBeneficiary,
  isProxyTransaction,
} from '@/entities/transaction';

/**
 * Represents extracted transfer information from a multisig operation. Contains
 * both raw and formatted values for flexibility in different contexts.
 */
export type TransferAmountInfo = {
  /** Raw amount in chain units (planck/smallest denomination) */
  rawAmount: string;
  /** Human-readable formatted amount (e.g., "10.5") */
  formattedAmount: string;
  /** Full display string with symbol (e.g., "10.5 DOT") */
  displayAmount: string;
  /** Asset symbol (e.g., "DOT", "KSM") */
  assetSymbol: string;
  /** Asset precision/decimals */
  assetPrecision: number;
  /** Recipient account ID if applicable */
  recipient: AccountId | null;
  /** Formatted recipient address with chain prefix */
  recipientAddress: string | null;
};

/**
 * Transaction types that represent value transfers. This includes direct
 * transfers, XCM, staking operations, and governance actions.
 */
const VALUE_TRANSFER_TYPES = new Set<TransactionType>([
  // Direct transfers
  ...TransferTypes,
  // Cross-chain transfers
  ...XcmTypes,
  // Staking operations with amounts
  TransactionType.BOND,
  TransactionType.STAKE_MORE,
  TransactionType.UNSTAKE,
  TransactionType.RESTAKE,
  TransactionType.UNLOCK,
  // Governance operations with amounts
  TransactionType.DELEGATE,
  TransactionType.VOTE,
  // Vesting
  TransactionType.VESTED_TRANSFER,
]);

/**
 * Checks if a transaction type represents a value transfer operation.
 */
const isValueTransferType = (type: TransactionType | undefined): boolean => {
  if (!type) return false;
  return VALUE_TRANSFER_TYPES.has(type);
};

/**
 * Checks if an operation contains a transaction with transferable amount.
 * Handles proxy wrapping and batch transactions.
 */
export const hasTransferAmount = (operation: MultisigOperation): boolean => {
  const coreTx = getCoreTx(operation);
  if (!coreTx?.type) return false;

  // Check direct value transfer types
  if (isValueTransferType(coreTx.type as TransactionType)) {
    return true;
  }

  // Check batch transactions
  if (coreTx.type === TransactionType.BATCH_ALL) {
    const transactions = coreTx.args?.transactions as DecodedTransaction[] | undefined;
    return transactions?.some(tx => isValueTransferType(tx.type as TransactionType)) ?? false;
  }

  return false;
};

/**
 * Gets the core transaction unwrapping proxy if needed.
 */
const getCoreTx = (operation: MultisigOperation): DecodedTransaction | null => {
  const tx = operation.transaction;
  if (!tx) return null;

  if (isProxyTransaction(tx)) {
    return tx.args?.transaction ?? null;
  }

  return tx;
};

/**
 * Resolves the asset for a transaction. Priority: transaction's assetId >
 * native asset
 */
const resolveTransactionAsset = (transaction: DecodedTransaction | null, chain: Chain): Asset | null => {
  if (!chain?.assets?.length) return null;

  const coreTx = findCoreTransaction(transaction);

  // Check for explicit asset ID in transaction args
  if (coreTx?.args?.assetId) {
    const assetById = getAssetById(String(coreTx.args.assetId), chain.assets);
    if (assetById) return assetById;
  }

  // Default to native asset
  return getNativeAsset(chain.assets);
};

/**
 * Extracts the recipient from a transaction. Handles different transaction
 * formats including XCM.
 */
const extractRecipient = (transaction: DecodedTransaction | null): AccountId | null => {
  const coreTx = findCoreTransaction(transaction);
  if (!coreTx) return null;

  // XCM transactions have complex beneficiary extraction
  if (XcmTypes.includes(coreTx.type as TransactionType)) {
    return getXcmTransactionBeneficiary(coreTx) ?? null;
  }

  // Standard transfers use 'dest' argument
  const dest = coreTx.args?.dest;
  if (typeof dest === 'string') return dest as AccountId;

  // Handle structured dest (e.g., { Id: '...' })
  if (dest && typeof dest === 'object' && 'Id' in dest) {
    return dest.Id as AccountId;
  }

  return null;
};

/**
 * Extracts transfer amount information from a multisig operation. Returns null
 * if the operation doesn't involve a value transfer.
 *
 * @param operation - The multisig operation to extract from
 * @param chain - The chain configuration for asset resolution
 *
 * @returns TransferAmountInfo or null if not a transfer operation
 */
export const extractTransferAmount = (operation: MultisigOperation, chain: Chain | null): TransferAmountInfo | null => {
  if (!hasTransferAmount(operation) || !chain) {
    return null;
  }

  const coreTx = getCoreTx(operation);
  if (!coreTx) return null;

  // Get the raw amount using the existing utility
  const rawAmount = getTransactionAmount(coreTx);
  if (!rawAmount) return null;

  // Resolve the asset
  const asset = resolveTransactionAsset(operation.transaction, chain);
  if (!asset) return null;

  // Format the amount using the asset's precision
  const formattedAmount = fromPrecision(rawAmount, asset.precision);
  const displayAmount = `${formattedAmount} ${asset.symbol}`;

  // Extract recipient
  const recipient = extractRecipient(operation.transaction);
  const recipientAddress = recipient ? toAddress(recipient, { prefix: chain.addressPrefix }) : null;

  return {
    rawAmount,
    formattedAmount,
    displayAmount,
    assetSymbol: asset.symbol,
    assetPrecision: asset.precision,
    recipient,
    recipientAddress,
  };
};

/**
 * Batch extracts transfer amounts for multiple operations. Useful for CSV
 * export where we process many operations at once.
 */
export const extractTransferAmounts = (
  operations: MultisigOperation[],
  chains: Record<string, Chain>,
): Map<string, TransferAmountInfo | null> => {
  const results = new Map<string, TransferAmountInfo | null>();

  for (const operation of operations) {
    const chain = chains[operation.chainId] ?? null;
    results.set(operation.id, extractTransferAmount(operation, chain));
  }

  return results;
};
