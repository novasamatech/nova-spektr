import { type ApiPromise } from '@polkadot/api';
import { type GenericExtrinsic } from '@polkadot/types';
import { type AnyTuple } from '@polkadot/types/types';
import { u8aToHex } from '@polkadot/util';
import { createKeyMulti } from '@polkadot/util-crypto';

import {
  type CallHash,
  type Chain,
  type ChainId,
  ChainOptions,
  CryptoType,
  type FlexibleMultisigAccount,
  type MultisigAccount,
} from '@/shared/core';
import { isEqual, merge, nonNullable, nullable, validateCallData } from '@/shared/lib/utils';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';
import { transactionService } from '../transaction/service';

import { DEFAULT_BLOCK_HASH, MULTISIG_EXTRINSIC_CALL_INDEX, WRAP_EXTRINSIC_CALL_INDEX } from './constants';
import { type MultisigEvent, type MultisigOperation } from './types';

/**
 * Public keys of signers' wallets are compared byte-for-byte and sorted
 * ascending before being used to generate the multisig address. For example,
 * consider the scenario with three addresses, A, B, and C, starting with 5FUGT,
 * 5HMfS, and 5GhKJ. If we build the ABC multisig with the accounts in that
 * specific order (i.e. first A, then B, and C), the real order of the accounts
 * in the multisig will be ACB. If, in the Extrinsic tab, we initiate a multisig
 * call with C, the order of the other signatories will be first A, then B. If
 * we put first B, then A, the transaction will fail.
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

function getOperationId(chainId: ChainId, callHash: string, accountId: AccountId, block: number, index: number) {
  return `${chainId}-${callHash}-${accountId}-${block}-${index}`;
}

function getEventId(operationId: string, signer: string, status: 'approve' | 'reject') {
  return `${operationId}-${signer}-${status}`;
}

function findInnerExtrinsicCall(extrinsic: GenericExtrinsic<AnyTuple>) {
  const findAsMulti = (method: any): any => {
    if (!method) return null;

    if (method.toHuman().method === 'asMulti' && method.toHuman().section === 'multisig') {
      return method.args[MULTISIG_EXTRINSIC_CALL_INDEX];
    }

    if (method.toHuman().method === 'batchAll') {
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

const mergeEvents = (oldEvents: MultisigEvent[], events: MultisigEvent[]) =>
  merge({
    a: oldEvents,
    b: events,
    mergeBy: a => a.id,
    filter: (a, b) => !isEqual(a, b),
    sort: (a, b) => a.blockCreated - b.blockCreated,
  });

const mergeMultisigOperations = (
  oldOperations: MultisigOperation[],
  operations: MultisigOperation[],
): MultisigOperation[] => {
  /**
   * Because we work with Events AT BEST, it may happen that our db has extra
   * operations that are not on the chain anymore nor were executed. We want to
   * filter them out.
   *
   * For example, if we have a fork and operation was executed in the different
   * block than we first recevied event of.
   */
  const oldFilteredForPending = oldOperations.filter(
    oldOperation =>
      !operations.some(
        operation => operation.chainId === oldOperation.chainId && operation.accountId === oldOperation.accountId,
      ),
  );

  return merge({
    a: oldFilteredForPending,
    b: operations,
    filter: (a, b) => {
      if (isEqual(a, b)) {
        return false;
      }

      // Update should be skipped if the new record is in a "pending" state while the existing record is already completed.
      // This can happen after operation approval, when the subquery indexer hasn't received that update yet.
      if (b.status === 'pending' && a.status !== 'pending') {
        return false;
      }

      return true;
    },
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

export const multisigOperationService = {
  getOperationId,
  getEventId,
  getTransactionFromChain,
  getMultisigAccountId,

  mergeEvents,
  mergeMultisigOperations,

  isMultisigSupported,
  getOtherSignatories,
  sortSignatories,
};
