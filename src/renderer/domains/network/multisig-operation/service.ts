import { type ApiPromise } from '@polkadot/api';
import { type GenericExtrinsic } from '@polkadot/types';
import { type AnyTuple } from '@polkadot/types/types';
import { u8aToHex } from '@polkadot/util';
import { createKeyMulti } from '@polkadot/util-crypto';
import { uniqBy } from 'lodash';

import {
  type CallHash,
  type Chain,
  type DecodedTransaction,
  type FlexibleMultisigAccount,
  type MultisigAccount,
  type NoID,
  type Serializable,
  type Signatory,
  ChainOptions,
  CryptoType,
  SigningType,
} from '@/shared/core';
import { isEqual, merge, nonNullable, nullable, toAccountId, validateCallData } from '@/shared/lib/utils';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';
import { Paths } from '@/shared/routes';
import { accountService } from '../account/service';
import { type AnyAccount } from '../account/types';
import { transactionService } from '../transaction/service';

import { DEFAULT_BLOCK_HASH, MULTISIG_EXTRINSIC_CALL_INDEX, WRAP_EXTRINSIC_CALL_INDEX } from './constants';
import { type MultisigEvent, type MultisigOperation, MultisigEventStatus } from './types';

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
    merge: (a, b) => {
      // A still-pending version must not shadow one that already knows how the
      // operation resolved — either side can lag the other (live storage
      // snapshot vs indexer catching up).
      const status = b.status === 'pending' && a.status !== 'pending' ? a.status : b.status;

      return {
        ...b,
        status,
        // The awaiting-outcome marker only makes sense while the merged status
        // is still pending — drop it as soon as either side knows the outcome.
        awaitingOutcome: status === 'pending' ? (b.awaitingOutcome ?? a.awaitingOutcome) : undefined,
        // Union: each side can know approvals the other lacks — the live path has
        // storage-derived approvals the indexer hasn't indexed yet, the indexer
        // has the executor's approval when the live event was missed. On an id
        // collision the a-side (indexer) event wins: it carries the real per-event
        // block and timestamp, while storage-derived events reuse the creation
        // timepoint.
        events: uniqBy([...a.events, ...b.events], event => event.id),
        callData: b.callData ?? a.callData,
        callHash: b.callHash ?? a.callHash,
        transaction: b.transaction ?? a.transaction,
        section: b.section ?? a.section,
        method: b.method ?? a.method,
      };
    },
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

function getApprovals(op: Pick<MultisigOperation, 'events'>): MultisigEvent[] {
  return op.events.filter(e => e.status === MultisigEventStatus.Approve);
}

function getApprovers(op: Pick<MultisigOperation, 'events'>): Set<AccountId> {
  return new Set(getApprovals(op).map(e => e.accountId));
}

function getApprovalsCount(op: Pick<MultisigOperation, 'events'>): number {
  return getApprovals(op).length;
}

function getOperationTimestamp(op: Pick<MultisigOperation, 'timestamp' | 'events'>): number {
  return op.timestamp ?? op.events.at(0)?.timestamp ?? 0;
}

/**
 * Matches a wallet account against a multisig signatory entry. When the
 * signatory pins a specific `walletId` (its `id` field), both accountId and
 * walletId must match — otherwise the accountId alone is sufficient.
 */
function accountMatchesSignatory(account: Pick<AnyAccount, 'accountId' | 'walletId'>, signatory: Signatory): boolean {
  if (account.accountId !== signatory.accountId) return false;

  return signatory.id ? signatory.id === account.walletId : true;
}

/**
 * Returns the user-controlled signatory accounts that can still act on this
 * operation — i.e. signatories that haven't approved yet, available on the
 * chain, and not watch-only. An empty array means "user can only reject / is
 * just waiting".
 */
function findActionableSignatories(
  op: Pick<MultisigOperation, 'events'>,
  multisigAccount: MultisigAccount | FlexibleMultisigAccount,
  walletAccounts: AnyAccount[],
  chain: Chain | null | undefined,
): AnyAccount[] {
  if (!chain) return [];

  const approvedBy = getApprovers(op);
  const actionable: AnyAccount[] = [];

  for (const signatory of multisigAccount.signatories) {
    if (approvedBy.has(signatory.accountId)) continue;

    for (const account of walletAccounts) {
      if (account.signingType === SigningType.WATCH_ONLY) continue;
      if (!accountMatchesSignatory(account, signatory)) continue;
      if (!accountService.isAccountAvailableOnChain(account, chain)) continue;

      actionable.push(account);
    }
  }

  return actionable;
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

  getApprovals,
  getApprovers,
  getApprovalsCount,
  getOperationTimestamp,
  findActionableSignatories,
  accountMatchesSignatory,
};
