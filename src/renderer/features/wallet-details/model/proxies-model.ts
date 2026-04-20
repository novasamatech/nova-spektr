import { combine } from 'effector';

import { type ChainId, type DecodedTransaction, type HexString, type Wallet } from '@/shared/core';
import { type ProxyType, ProxyTypeOrder, ProxyTypes } from '@/shared/core/types/proxy';
import { nullable, toAccountId } from '@/shared/lib/utils';
import { type AccountId, type BlockHeight } from '@/shared/polkadotjs-schemas';
import {
  type AnyAccount,
  type MultisigOperation,
  accounts,
  multisigOperation,
  multisigOperationService,
} from '@/domains/network';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { multisigService } from '@/features/multisig-wallet';

import { walletProxiesModel } from './wallet-proxies-model';

/**
 * Proxy types whose runtime filter accepts `system.remark`. Used to decide
 * whether the Verify-via-proxy action should be exposed for a proxy row.
 *
 * `Any` permits any call; `NonTransfer` rejects only balance transfers. All
 * other types (Governance, Staking, etc.) reject System pallet calls.
 */
export const VERIFIABLE_PROXY_TYPES: ReadonlySet<ProxyType> = new Set([ProxyTypes.ANY, ProxyTypes.NON_TRANSFER]);

export type WalletProxyStatus = 'verified' | 'not_verified' | 'pending_addition' | 'not_verified_no_wallet';

export type WalletProxyLastOperation = {
  txHash: HexString;
  callHash: HexString;
  blockNumber: BlockHeight;
  indexCreated: number;
  timestamp: number;
  multisigAccountId: AccountId;
  transaction: DecodedTransaction | null;
};

export type PendingMultisigOperationRef = {
  operationId: string;
  chainId: ChainId;
  callHash: HexString;
  multisigAccountId: AccountId;
  blockCreated: BlockHeight;
  indexCreated: number;
};

export type WalletProxy = {
  id: string;
  chainId: ChainId;
  pureProxyAccountId: AccountId;
  proxyAccountId: AccountId;
  proxyMultisigAccountId: AccountId | null;
  proxyWallet: Wallet | null;
  proxyAccount: AnyAccount | null;
  proxyType: ProxyType;
  delay: number;
  status: WalletProxyStatus;
  /**
   * Verify-via-proxy action eligibility. Multisig proxy account, proxy type
   * permits `system.remark`, and delay is zero. Fee sufficiency is re-checked
   * inside the verify modal because it requires chain data the list does not
   * load.
   */
  verifiable: boolean;
  lastOperation: WalletProxyLastOperation | null;
  pendingOperation: PendingMultisigOperationRef | null;
  /**
   * When a pending multisig op whose decoded call is `proxy.removeProxy`
   * targets this on-chain proxy row, this points at that operation so the UI
   * can disable Revoke and deep-link to the operations page. Never set on a
   * `pending_addition` row — that row doesn't exist on chain yet.
   */
  pendingRemovalOperation: PendingMultisigOperationRef | null;
  /**
   * When a pending multisig op is a Verify-via-proxy call (`proxy.proxy(real,
   * forceProxyType, system.remark)`) targeting this row, this points at that
   * operation so the UI can replace the "Verify via proxy" button with "View
   * operation" while signatories sign.
   */
  pendingVerificationOperation: PendingMultisigOperationRef | null;
};

type ProxyDelegationArgs = { proxy: AccountId; proxyType: ProxyType; delay: number };

/**
 * Shared `(delegate, proxyType, delay)` arg extractor. `proxy.addProxy`,
 * `proxy.addProxyWithDelay`, and `proxy.removeProxy` all take the same tuple.
 *
 * Unwrap convention: `proxy.proxy` stores the raw hex of the inner call at
 * `args.call` and the recursively decoded inner call at `args.transaction`
 * ([callDataDecoder.ts:134-135](src/renderer/entities/transaction/lib/callDataDecoder.ts#L134-L135)).
 * We read `args.transaction` — reading `args.call` silently fails because it is
 * a string, not a DecodedTransaction.
 *
 * Mirrors `extractProxiedAccountId`'s shape assumptions intentionally — new
 * shapes must be supported here and there together or pending rows drift from
 * verified ones.
 */
function extractProxyDelegationArgs(
  tx: DecodedTransaction | null | undefined,
  matchesLeaf: (tx: DecodedTransaction) => boolean,
): ProxyDelegationArgs | null {
  if (nullable(tx)) return null;

  if (tx.section === 'proxy' && tx.method === 'proxy') {
    const inner = tx.args['transaction'];
    return extractProxyDelegationArgs(inner as DecodedTransaction | undefined, matchesLeaf);
  }

  if (tx.section === 'utility' && ['batch', 'batchAll', 'forceBatch'].includes(tx.method)) {
    const transactions = tx.args['transactions'];
    if (!Array.isArray(transactions) || transactions.length === 0) return null;

    return extractProxyDelegationArgs(transactions[0] as DecodedTransaction, matchesLeaf);
  }

  if (!matchesLeaf(tx)) return null;

  const rawDelegate = tx.args['delegate'];
  const rawProxyType = tx.args['proxyType'];
  const rawDelay = tx.args['delay'];

  if (typeof rawDelegate !== 'string' || typeof rawProxyType !== 'string') return null;

  return {
    proxy: toAccountId(rawDelegate),
    proxyType: rawProxyType as ProxyType,
    delay: typeof rawDelay === 'number' ? rawDelay : Number(rawDelay ?? 0),
  };
}

function extractAddProxyArgs(tx: DecodedTransaction | null | undefined): ProxyDelegationArgs | null {
  return extractProxyDelegationArgs(
    tx,
    t => t.section === 'proxy' && (t.method === 'addProxy' || t.method === 'addProxyWithDelay'),
  );
}

/**
 * `proxy.removeProxies` (no args, removes all) is intentionally unsupported —
 * matching it to specific rows would require enumerating every existing proxy
 * on the current wallet, and the user-facing affordance ("this specific proxy
 * is pending removal") is clearer when left to `removeProxy`.
 */
function extractRemoveProxyArgs(tx: DecodedTransaction | null | undefined): ProxyDelegationArgs | null {
  return extractProxyDelegationArgs(tx, t => t.section === 'proxy' && t.method === 'removeProxy');
}

type ProxyExecutionArgs = { real: AccountId; proxyType: ProxyType };

/**
 * Reads `(real, forceProxyType)` off a bare `proxy.proxy` call. Any inner call
 * counts as proof the proxy is reachable — verification doesn't require
 * `system.remark` specifically — so the inner call is intentionally ignored.
 *
 * Batch wrappers are not unwrapped here on purpose: a batched call also won't
 * match `extractProxiedAccountId` for executed-op detection, so accepting them
 * here would mark a row as verification-pending that can never flip to
 * verified, leaving the row stuck.
 */
function extractProxyExecutionArgs(tx: DecodedTransaction | null | undefined): ProxyExecutionArgs | null {
  if (nullable(tx)) return null;
  if (tx.section !== 'proxy' || tx.method !== 'proxy') return null;

  const rawReal = tx.args['real'];
  const rawProxyType = tx.args['forceProxyType'];
  if (typeof rawReal !== 'string' || typeof rawProxyType !== 'string') return null;

  return { real: toAccountId(rawReal), proxyType: rawProxyType as ProxyType };
}

function proxyEntryId(chainId: ChainId, proxyAccount: AccountId, proxyType: ProxyType, pureProxy: AccountId): string {
  return `${chainId}:${pureProxy}:${proxyAccount}:${proxyType}`;
}

type ProxyResolution = {
  wallet: Wallet | null;
  account: AnyAccount | null;
  multisigAccountId: AccountId | null;
  isMultisig: boolean;
};

function resolveProxy(wallets: Wallet[], proxyAccountId: AccountId, chainId: ChainId): ProxyResolution {
  const matched = walletUtils.getWalletFilteredAccounts(wallets, {
    walletFn: w => !walletUtils.isWatchOnly(w),
    accountFn: account => {
      if (account.accountId === proxyAccountId) return true;
      // Flexible multisig wallets register the inner multisig key on chain as
      // the proxy account, not the pure proxy that represents the wallet.
      if (accountUtils.isFlexibleMultisigAccount(account) && account.multisigAccountId === proxyAccountId) {
        return account.chainId === chainId;
      }
      return false;
    },
  });

  if (!matched) {
    return { wallet: null, account: null, multisigAccountId: null, isMultisig: false };
  }

  const account = matched.accounts[0] ?? null;
  if (!account) {
    return { wallet: matched, account: null, multisigAccountId: null, isMultisig: false };
  }

  if (accountUtils.isAnyMultisigAccount(account)) {
    return {
      wallet: matched,
      account,
      multisigAccountId: multisigService.getMultisigAccountId(account),
      isMultisig: true,
    };
  }

  return { wallet: matched, account, multisigAccountId: null, isMultisig: false };
}

function findLatestExecutedOperation(
  operations: MultisigOperation[],
  chainId: ChainId,
  pureProxyAccountId: AccountId,
  proxyMultisigAccountId: AccountId,
): MultisigOperation | null {
  let latest: MultisigOperation | null = null;

  for (const op of operations) {
    if (op.chainId !== chainId) continue;
    if (op.status !== 'executed') continue;
    if (op.multisigAccountId !== proxyMultisigAccountId) continue;
    if (op.proxiedAccountId !== pureProxyAccountId) continue;

    if (!latest || op.blockCreated > latest.blockCreated) {
      latest = op;
    }
  }

  return latest;
}

function sortProxiesInBucket(a: WalletProxy, b: WalletProxy): number {
  const chainCompare = a.chainId.localeCompare(b.chainId);
  if (chainCompare !== 0) return chainCompare;

  const aProxyOrder = ProxyTypeOrder.indexOf(a.proxyType);
  const bProxyOrder = ProxyTypeOrder.indexOf(b.proxyType);
  if (aProxyOrder !== bProxyOrder) return aProxyOrder - bProxyOrder;

  const aName = a.proxyWallet?.name ?? '';
  const bName = b.proxyWallet?.name ?? '';
  return aName.localeCompare(bName);
}

function bucketRank(proxy: WalletProxy): number {
  if (proxy.status === 'pending_addition') return 0;
  if (proxy.status === 'not_verified' && proxy.verifiable) return 1;
  if (
    proxy.status === 'not_verified' &&
    proxy.proxyWallet !== null &&
    accountUtils.isAnyMultisigAccount(proxy.proxyAccount ?? ({} as AnyAccount)) &&
    !proxy.verifiable
  ) {
    return 2;
  }
  if (proxy.status === 'not_verified_no_wallet') return 3;
  if (proxy.status === 'not_verified') return 4;
  return 5; // verified
}

const $proxies = combine(
  {
    wallet: walletProxiesModel.$wallet,
    walletProxies: walletProxiesModel.$walletProxies,
    wallets: walletModel.$wallets,
    operations: multisigOperation.$list,
    allAccounts: accounts.$list,
  },
  ({ wallet, walletProxies, wallets, operations, allAccounts }): WalletProxy[] => {
    if (!wallet) return [];

    const onChainProxies: WalletProxy[] = [];
    const seenKeys = new Set<string>();

    for (const chainProxies of Object.values(walletProxies)) {
      for (const proxy of chainProxies.proxies) {
        const key = proxyEntryId(proxy.chainId, proxy.accountId, proxy.proxyType, proxy.proxiedAccountId);
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        const resolved = resolveProxy(wallets, proxy.accountId, proxy.chainId);

        let status: WalletProxyStatus;
        let lastOperation: WalletProxyLastOperation | null = null;
        let verifiable = false;

        if (!resolved.wallet) {
          status = 'not_verified_no_wallet';
        } else if (resolved.isMultisig && resolved.multisigAccountId) {
          const executed = findLatestExecutedOperation(
            operations,
            proxy.chainId,
            proxy.proxiedAccountId,
            resolved.multisigAccountId,
          );

          if (executed) {
            status = 'verified';
            lastOperation = {
              txHash: executed.callHash,
              callHash: executed.callHash,
              blockNumber: executed.blockCreated,
              indexCreated: executed.indexCreated,
              timestamp: executed.timestamp,
              multisigAccountId: executed.multisigAccountId,
              transaction: executed.transaction,
            };
          } else {
            status = 'not_verified';
          }

          verifiable = VERIFIABLE_PROXY_TYPES.has(proxy.proxyType) && proxy.delay === 0;
        } else {
          status = 'not_verified';
        }

        onChainProxies.push({
          id: key,
          chainId: proxy.chainId,
          pureProxyAccountId: proxy.proxiedAccountId,
          proxyAccountId: proxy.accountId,
          proxyMultisigAccountId: resolved.multisigAccountId,
          proxyWallet: resolved.wallet,
          proxyAccount: resolved.account,
          proxyType: proxy.proxyType,
          delay: proxy.delay,
          status,
          verifiable,
          lastOperation,
          pendingOperation: null,
          pendingRemovalOperation: null,
          pendingVerificationOperation: null,
        });
      }
    }

    const pendingProxies: WalletProxy[] = [];

    // Synthesise pending_addition rows from pending multisig addProxy ops
    // targeting any signer multisig of this wallet, and annotate on-chain rows
    // with a pendingRemovalOperation for pending removeProxy ops. Dedupe
    // additions against on-chain rows so an addProxy that landed before the op
    // list refreshed doesn't double up.
    // Signer multisigs are exactly the multisigs already resolved as on-chain
    // proxies of this wallet's pure proxy. Built per-row by `resolveProxy`, so
    // it covers Flex's built-in inner multisig AND any extra multisig proxies
    // added later through addProxy. Earlier per-wallet-type heuristics missed
    // the latter for Flex wallets.
    const signerMultisigIds = new Set<AccountId>();
    for (const row of onChainProxies) {
      if (row.proxyMultisigAccountId) signerMultisigIds.add(row.proxyMultisigAccountId);
    }

    if (signerMultisigIds.size > 0) {
      const pureProxyAccountIds = new Set<AccountId>();
      if (walletUtils.isProxied(wallet) || walletUtils.isFlexibleMultisig(wallet)) {
        for (const account of wallet.accounts) {
          pureProxyAccountIds.add(account.accountId);
        }
      }

      for (const op of operations) {
        if (op.status !== 'pending') continue;
        if (!signerMultisigIds.has(op.multisigAccountId)) continue;

        const targetPureProxy = multisigOperationService.extractProxiedAccountId(op.transaction);
        if (!targetPureProxy) continue;
        if (!pureProxyAccountIds.has(targetPureProxy)) continue;

        const pendingRef: PendingMultisigOperationRef = {
          operationId: op.id,
          chainId: op.chainId,
          callHash: op.callHash,
          multisigAccountId: op.multisigAccountId,
          blockCreated: op.blockCreated,
          indexCreated: op.indexCreated,
        };

        // Any pending `proxy.proxy(real, forceProxyType, …)` from this signer
        // multisig proves the proxy is reachable, so stamp the matching row
        // independently of whether the inner call also triggers an
        // addProxy/removeProxy classification.
        const executionArgs = extractProxyExecutionArgs(op.transaction);
        if (executionArgs) {
          const row = onChainProxies.find(
            r =>
              r.chainId === op.chainId &&
              r.pureProxyAccountId === executionArgs.real &&
              r.proxyType === executionArgs.proxyType &&
              r.proxyMultisigAccountId === op.multisigAccountId,
          );
          if (row && !row.pendingVerificationOperation) {
            row.pendingVerificationOperation = pendingRef;
          }
        }

        const addProxyArgs = extractAddProxyArgs(op.transaction);
        if (addProxyArgs) {
          const key = proxyEntryId(op.chainId, addProxyArgs.proxy, addProxyArgs.proxyType, targetPureProxy);
          if (seenKeys.has(key)) continue;
          seenKeys.add(key);

          const resolved = resolveProxy(wallets, addProxyArgs.proxy, op.chainId);
          const account = allAccounts.find(a => a.accountId === addProxyArgs.proxy) ?? resolved.account;

          pendingProxies.push({
            id: key,
            chainId: op.chainId,
            pureProxyAccountId: targetPureProxy,
            proxyAccountId: addProxyArgs.proxy,
            proxyMultisigAccountId: resolved.multisigAccountId,
            proxyWallet: resolved.wallet,
            proxyAccount: account,
            proxyType: addProxyArgs.proxyType,
            delay: addProxyArgs.delay,
            status: 'pending_addition',
            verifiable: false,
            lastOperation: null,
            pendingOperation: pendingRef,
            pendingRemovalOperation: null,
            pendingVerificationOperation: null,
          });
          continue;
        }

        const removeProxyArgs = extractRemoveProxyArgs(op.transaction);
        if (removeProxyArgs) {
          const key = proxyEntryId(op.chainId, removeProxyArgs.proxy, removeProxyArgs.proxyType, targetPureProxy);
          const row = onChainProxies.find(r => r.id === key);
          if (row && !row.pendingRemovalOperation) {
            row.pendingRemovalOperation = pendingRef;
          }
        }
      }
    }

    const combined = [...onChainProxies, ...pendingProxies];

    combined.sort((a, b) => {
      const rankCompare = bucketRank(a) - bucketRank(b);
      if (rankCompare !== 0) return rankCompare;
      return sortProxiesInBucket(a, b);
    });

    return combined;
  },
);

const $verifiedCount = $proxies.map(proxies => proxies.filter(p => p.status === 'verified').length);
const $totalCount = $proxies.map(proxies => proxies.length);

const $isLoading = combine(
  { proxies: $proxies, proxiesLoading: walletProxiesModel.$isLoading },
  ({ proxiesLoading }) => proxiesLoading,
);

export const proxiesModel = {
  $proxies,
  $verifiedCount,
  $totalCount,
  $isLoading,

  __test: {
    extractAddProxyArgs,
    extractRemoveProxyArgs,
    extractProxyExecutionArgs,
    findLatestExecutedOperation,
    bucketRank,
    VERIFIABLE_PROXY_TYPES,
  },
};

export function isProxyVerifiable(proxy: Pick<WalletProxy, 'proxyType' | 'delay'>): boolean {
  return VERIFIABLE_PROXY_TYPES.has(proxy.proxyType) && proxy.delay === 0;
}
