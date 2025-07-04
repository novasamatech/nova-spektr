import { type ApiPromise } from '@polkadot/api';

import { type CallHash, type Chain, type ChainId, ChainOptions, type MultisigAccount } from '@/shared/core';
import { isEqual, merge, nullable, validateCallData } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { transactionService } from '../transaction/service';

import { DEFAULT_BLOCK_HASH, MULTISIG_EXTRINSIC_CALL_INDEX } from './constants';
import { type MultisigEvent, type MultisigOperation } from './types';

function getOtherSignatories(account: MultisigAccount, signer: AccountId) {
  return (
    Array.from(account.signatories)
      .map(s => s.accountId)
      .filter(account => account !== signer)
      /**
       * Public keys of signers' wallets are compared byte-for-byte and sorted
       * ascending before being used to generate the multisig address. For
       * example, consider the scenario with three addresses, A, B, and C,
       * starting with 5FUGT, 5HMfS, and 5GhKJ. If we build the ABC multisig
       * with the accounts in that specific order (i.e. first A, then B, and C),
       * the real order of the accounts in the multisig will be ACB. If, in the
       * Extrinsic tab, we initiate a multisig call with C, the order of the
       * other signatories will be first A, then B. If we put first B, then A,
       * the transaction will fail.
       */
      .sort((a, b) => a.localeCompare(b))
  );
}

function getOperationId(chainId: ChainId, callHash: string, address: string, block: number, index: number) {
  return `${chainId}-${callHash}-${address}-${block}-${index}`;
}

function getEventId(operationId: string, signer: string, status: 'approve' | 'reject') {
  return `${operationId}-${signer}-${status}`;
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
    if (!extrinsic.argsDef['call']) return null;

    const callData = extrinsic.args[MULTISIG_EXTRINSIC_CALL_INDEX]?.toHex();

    if (!callData || !validateCallData(callData, callHash)) return null;

    return transactionService.createSubmittableExtrinsic({ type: 'encoded', callData }, api);
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
    mergeBy: a => [a.blockCreated, a.indexCreated, a.accountId, a.status],
    filter: (a, b) => !isEqual(a, b),
    sort: (a, b) => a.blockCreated - b.blockCreated,
  });

const mergeMultisigOperations = (a: MultisigOperation[], b: MultisigOperation[]): MultisigOperation[] => {
  return merge({
    a,
    b,
    filter: (a, b) => !isEqual(a, b),
    mergeBy: a => [a.callHash, a.blockCreated, a.indexCreated, a.chainId, a.accountId],
    sort: (a, b) => a.blockCreated - b.blockCreated,
  });
};

export const multisigOperationService = {
  getOperationId,
  getEventId,
  getTransactionFromChain,

  mergeEvents,
  mergeMultisigOperations,

  isMultisigSupported,
  getOtherSignatories,
};
