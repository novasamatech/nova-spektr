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
import { isContactMultisigAccount } from './contact-multisigs';
import { type MultisigEvent, type MultisigOperation, MultisigEventStatus, MultisigOperationStatus } from './types';

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
        // Only meaningful while no side supplied valid call data.
        callDataMismatch: (b.callData ?? a.callData) ? undefined : (b.callDataMismatch ?? a.callDataMismatch),
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
 * A wallet account the user can sign with on behalf of `signatory` on `chain`:
 * it holds the signatory key, is not watch-only and is available on the chain.
 */
function canSignAsSignatory(account: AnyAccount, signatory: Signatory, chain: Chain): boolean {
  return (
    account.signingType !== SigningType.WATCH_ONLY &&
    accountMatchesSignatory(account, signatory) &&
    accountService.isAccountAvailableOnChain(account, chain)
  );
}

/**
 * Returns the multisig signatories the user owns on `chain` — those backed by
 * at least one non-watch-only wallet account available on the chain. This is
 * the set a "signed" state is about; the chain-availability check is what keeps
 * it in step with `findActionableSignatories`.
 */
function findOwnSignatories(
  multisigAccount: MultisigAccount | FlexibleMultisigAccount,
  walletAccounts: AnyAccount[],
  chain: Chain | null | undefined,
): Signatory[] {
  if (!chain) return [];

  return multisigAccount.signatories.filter(signatory =>
    walletAccounts.some(account => canSignAsSignatory(account, signatory, chain)),
  );
}

/**
 * Returns the user-controlled signatory accounts that can still act on this
 * operation — i.e. own signatories (see `findOwnSignatories`) that haven't
 * approved yet. An empty array means "user can only reject / is just waiting".
 */
function findActionableSignatories(
  op: Pick<MultisigOperation, 'events'>,
  multisigAccount: MultisigAccount | FlexibleMultisigAccount,
  walletAccounts: AnyAccount[],
  chain: Chain | null | undefined,
): AnyAccount[] {
  if (!chain) return [];

  const approvedBy = getApprovers(op);

  return findOwnSignatories(multisigAccount, walletAccounts, chain)
    .filter(signatory => !approvedBy.has(signatory.accountId))
    .flatMap(signatory => walletAccounts.filter(account => canSignAsSignatory(account, signatory, chain)));
}

/**
 * True when the user owns at least one signatory on `chain` and every own
 * signatory has already approved — nothing is left for the user to sign.
 */
function hasSignedWithAllOwnSignatories(
  op: Pick<MultisigOperation, 'events'>,
  multisigAccount: MultisigAccount | FlexibleMultisigAccount,
  walletAccounts: AnyAccount[],
  chain: Chain | null | undefined,
): boolean {
  const ownSignatories = findOwnSignatories(multisigAccount, walletAccounts, chain);
  if (ownSignatories.length === 0) return false;

  const approvedBy = getApprovers(op);

  return ownSignatories.every(signatory => approvedBy.has(signatory.accountId));
}

/**
 * Whether the operation still needs the user: it is collecting approvals and at
 * least one own signatory (see `findActionableSignatories`) has not acted yet —
 * the user can approve it, or add the call data it waits on. Shared by the
 * row's Approve button, the dashboard queue and the "Signed → Not signed"
 * filter so they can never disagree.
 */
function needsUserSignature(
  op: Pick<MultisigOperation, 'events' | 'status' | 'awaitingOutcome'>,
  multisigAccount: MultisigAccount | FlexibleMultisigAccount,
  walletAccounts: AnyAccount[],
  chain: Chain | null | undefined,
): boolean {
  // An awaiting-outcome operation has already left on-chain storage — it only
  // looks pending until the indexer reports; signing it would fail.
  if (op.status !== MultisigOperationStatus.Pending || op.awaitingOutcome) return false;
  // The user holds no signatory keys for a contact-backed multisig.
  if (isContactMultisigAccount(multisigAccount)) return false;

  return findActionableSignatories(op, multisigAccount, walletAccounts, chain).length > 0;
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
  findOwnSignatories,
  findActionableSignatories,
  needsUserSignature,
  hasSignedWithAllOwnSignatories,
  accountMatchesSignatory,
};
