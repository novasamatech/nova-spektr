import { combine } from 'effector';

import { type ChainId, type DecodedTransaction, type HexString, type Wallet } from '@/shared/core';
import { type ProxyType, ProxyTypeOrder, ProxyTypes } from '@/shared/core/types/proxy';
import { nullable, toAccountId } from '@/shared/lib/utils';
import { type AccountId, type BlockHeight } from '@/shared/polkadotjs-schemas';
import { type VerifyProxyMarkerPayload, parseVerifyProxyMarker } from '@/shared/transactions';
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
  verifiable: boolean;
  lastOperation: WalletProxyLastOperation | null;
  pendingOperation: PendingMultisigOperationRef | null;
  pendingRemovalOperation: PendingMultisigOperationRef | null;
  pendingVerificationOperation: PendingMultisigOperationRef | null;
};

type ProxyDelegationArgs = { proxy: AccountId; proxyType: ProxyType; delay: number };

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

function extractRemoveProxyArgs(tx: DecodedTransaction | null | undefined): ProxyDelegationArgs | null {
  return extractProxyDelegationArgs(tx, t => t.section === 'proxy' && t.method === 'removeProxy');
}

type ProxyExecutionArgs = { real: AccountId; proxyType: ProxyType };

function extractProxyExecutionArgs(tx: DecodedTransaction | null | undefined): ProxyExecutionArgs | null {
  if (nullable(tx)) return null;
  if (tx.section !== 'proxy' || tx.method !== 'proxy') return null;

  const rawReal = tx.args['real'];
  const rawProxyType = tx.args['forceProxyType'];
  if (typeof rawReal !== 'string' || typeof rawProxyType !== 'string') return null;

  // Flex-delegated ops nest one proxy.proxy inside another (flex routes through its own
  // pure before reaching the target). The innermost proxy.proxy is the one we're acting
  // as, so unwrap before returning.
  const inner = extractProxyExecutionArgs(tx.args['transaction'] as DecodedTransaction | undefined);
  if (inner) return inner;

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

function extractVerifyProxyMarker(tx: DecodedTransaction | null | undefined): VerifyProxyMarkerPayload | null {
  if (nullable(tx)) return null;
  if (tx.section === 'proxy' && tx.method === 'proxy') {
    return extractVerifyProxyMarker(tx.args['transaction'] as DecodedTransaction | undefined);
  }
  if (tx.section !== 'system' || tx.method !== 'remarkWithEvent') return null;
  const remark = tx.args['remark'];
  if (typeof remark !== 'string') return null;
  return parseVerifyProxyMarker(remark);
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

    // Lenient: any executed multisig op routed via this (multisig signer, pure proxy)
    // pair proves the proxy authority works, so it counts as "verified". The strict
    // marker check only applies to the pending side, where we need to distinguish a
    // verify ping in flight from incidental pending ops via the same proxy.
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

        // Prefer the innermost proxy.proxy real — for flex-delegated ops the outer
        // proxy.proxy is just the flex routing through its own pure and isn't the target.
        const executionArgs = extractProxyExecutionArgs(op.transaction);
        const targetPureProxy = executionArgs?.real ?? multisigOperationService.extractProxiedAccountId(op.transaction);
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

        // Strict gate (mirrors findLatestExecutedOperation): only stamp pending
        // verification when the op is actually our verify ping —
        // proxy.proxy(real=pure, call=system.remarkWithEvent(<verify-proxy marker>))
        // matching the row's (delegate, pure, proxyType, multisig signer). Otherwise
        // any incidental pending proxy.proxy op (transfer, stake, …) would falsely
        // flip the row to "pending verification" and hide the Verify button.
        const verifyMarker = extractVerifyProxyMarker(op.transaction);
        if (verifyMarker && executionArgs) {
          const row = onChainProxies.find(
            r =>
              r.chainId === op.chainId &&
              r.pureProxyAccountId === verifyMarker.pureProxyAccountId &&
              r.proxyAccountId === verifyMarker.delegateAccountId &&
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
  {
    allChainsLoaded: walletProxiesModel.$allChainsLoaded,
    operationsLoaded: multisigOperation.$initialLoadingComplete,
  },
  ({ allChainsLoaded, operationsLoaded }) => !allChainsLoaded || !operationsLoaded,
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
