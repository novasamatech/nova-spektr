import { type ApiPromise } from '@polkadot/api';
import { type GenericExtrinsic } from '@polkadot/types';
import { type AnyTuple } from '@polkadot/types/types';
import { u8aToHex } from '@polkadot/util';
import { createKeyMulti } from '@polkadot/util-crypto';

import {
  type CallHash,
  type Chain,
  type DecodedTransaction,
  type FlexibleMultisigAccount,
  type MultisigAccount,
  type NoID,
  type Serializable,
  ChainOptions,
  CryptoType,
} from '@/shared/core';
import { isEqual, merge, nonNullable, nullable, toAccountId, validateCallData } from '@/shared/lib/utils';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';
import { Paths } from '@/shared/routes';
import { transactionService } from '../transaction/service';

import { DEFAULT_BLOCK_HASH, MULTISIG_EXTRINSIC_CALL_INDEX, WRAP_EXTRINSIC_CALL_INDEX } from './constants';
import { type MultisigOperation } from './types';

/**
 * Public keys of signers' wallets are compared byte-for-byte and sorted
 * ascending before being used to generate the multisig address.
 */
function sortSignatories(signatories: AccountId[]) {
  return Array.from(signatories).sort((a, b) => a.localeCompare(b));
}

function getMultisigAccountId(signatories: AccountId[], threshold: number, cryptoType: CryptoType): AccountId {
  const accountId = createKeyMulti(sortSignatories(signatories), threshold);
  const isEthereum = cryptoType === CryptoType.ETHEREUM;

  return pjsSchema.helpers.toAccountId(u8aToHex(isEthereum ? accountId.subarray(0, 20) : accountId));
}

function getOtherSignatories(account: MultisigAccount | FlexibleMultisigAccount, signer: AccountId) {
  return sortSignatories(
    Array.from(account.signatories)
      .map(s => s.accountId)
      .filter(account => account !== signer),
  );
}

function getOperationId(chainId: string, callHash: string, accountId: string, block: number, index: number) {
  return `${chainId}-${callHash}-${accountId}-${block}-${index}`;
}

function getEventId(operationId: string, signer: string, status: 'approve' | 'reject') {
  return `${operationId}-${signer}-${status}`;
}

export const serializeOperation = <T extends NoID<MultisigOperation>>(tx: T) => {
  return {
    ...tx,
    deposit: tx.deposit?.toString(),
  } as Serializable<T>;
};

function findInnerExtrinsicCall(extrinsic: GenericExtrinsic<AnyTuple>) {
  const findAsMulti = (method: any): any => {
    if (!method) return null;

    const human = method.toHuman?.();
    if (!human) return null;

    if (human.method === 'asMulti' && human.section === 'multisig') {
      return method.args[MULTISIG_EXTRINSIC_CALL_INDEX];
    }

    if (human.method === 'batchAll') {
      for (const arg of method.args[0]) {
        const result = findAsMulti(arg);
        if (nonNullable(result)) {
          return result;
        }
      }
    }

    if (method.args) {
      return findAsMulti(method.args[WRAP_EXTRINSIC_CALL_INDEX]);
    }

    return null;
  };

  return findAsMulti(extrinsic.method);
}

// Callback for not indexed transaction
type GetCallDataParams = {
  api: ApiPromise;
  callHash: CallHash;
  blockHeight: number;
  extrinsicIndex: number;
};
async function getTransactionFromChain({ api, callHash, blockHeight, extrinsicIndex }: GetCallDataParams) {
  try {
    const blockHash = await api.rpc.chain.getBlockHash(blockHeight);
    if (blockHash.toHex() === DEFAULT_BLOCK_HASH) return null;

    const { block } = await api.rpc.chain.getBlock(blockHash);
    const extrinsic = block.extrinsics[extrinsicIndex];
    if (nullable(extrinsic)) return null;

    const innerCall = findInnerExtrinsicCall(extrinsic);

    if (nullable(innerCall)) return null;

    const callData = innerCall?.toHex();

    if (!callData || !validateCallData(callData, callHash)) return null;

    return transactionService.createExtrinsic({ type: 'encoded', callData }, api);
  } catch (e) {
    console.warn('Error during update call data from chain', e);

    return null;
  }
}

function isMultisigSupported(chain: Chain) {
  return chain.options?.includes(ChainOptions.MULTISIG) ?? false;
}

/*
 * Performs an actual merge of old operations with new operations with update if they have the same id.
 */
const mergeMultisigOperations = (
  oldOperations: MultisigOperation[],
  updated: MultisigOperation[],
): MultisigOperation[] => {
  return merge({
    a: oldOperations,
    b: updated,
    filter: (a, b) => !isEqual(a, b),
    mergeBy: a => a.id,
    sort: (a, b) => a.blockCreated - b.blockCreated,
    merge: (a, b) => ({
      ...b,
      callData: b.callData ?? a.callData,
      callHash: b.callHash ?? a.callHash,
      transaction: b.transaction ?? a.transaction,
      section: b.section ?? a.section,
      method: b.method ?? a.method,
    }),
  });
};

export type MultisigOperationDeepLinkParams = {
  chainId: string;
  callHash: string;
  multisigAccountId: AccountId;
  blockCreated: number;
  indexCreated: number;
};

function generateMultisigOperationDeepLink(params: MultisigOperationDeepLinkParams): string {
  const searchParams = new URLSearchParams({
    chainId: params.chainId,
    callHash: params.callHash,
    accountId: params.multisigAccountId,
    blockCreated: params.blockCreated.toString(),
    indexCreated: params.indexCreated.toString(),
  });

  return `${window.location.origin}/#${Paths.OPERATIONS}?${searchParams.toString()}`;
}

function generateMultisigOperationRelativeLink(params: MultisigOperationDeepLinkParams): string {
  const searchParams = new URLSearchParams({
    chainId: params.chainId,
    callHash: params.callHash,
    accountId: params.multisigAccountId,
    blockCreated: params.blockCreated.toString(),
    indexCreated: params.indexCreated.toString(),
  });

  return `${Paths.OPERATIONS}?${searchParams.toString()}`;
}

/**
 * Extracts the proxied account ID from a decoded transaction when the outermost
 * call is proxy.proxy (direct) or utility.batchAll wrapping proxy.proxy calls
 * (Nova Wallet style).
 *
 * For batch calls, only the first transaction is inspected via a recursive
 * call; nested proxy calls inside arbitrary inner structures are intentionally
 * ignored.
 */
function extractProxiedAccountId(transaction: DecodedTransaction | null): AccountId | undefined {
  if (nullable(transaction)) return undefined;

  const isDirectProxy = transaction.section === 'proxy' && transaction.method === 'proxy';
  if (isDirectProxy) {
    const real: unknown = transaction.args['real'];
    return typeof real === 'string' ? toAccountId(real) : undefined;
  }

  const isBatchAll =
    transaction.section === 'utility' && ['batchAll', 'batch', 'forceBatch'].includes(transaction.method);
  if (isBatchAll) {
    const transactions: unknown = transaction.args['transactions'];
    if (!Array.isArray(transactions) || transactions.length === 0) return undefined;

    return extractProxiedAccountId(transactions[0] as DecodedTransaction);
  }

  return undefined;
}

export const multisigOperationService = {
  getOperationId,
  getEventId,
  getTransactionFromChain,
  getMultisigAccountId,

  mergeMultisigOperations,

  extractProxiedAccountId,

  isMultisigSupported,
  getOtherSignatories,

  generateMultisigOperationDeepLink,
  generateMultisigOperationRelativeLink,

  findInnerExtrinsicCall,
};
