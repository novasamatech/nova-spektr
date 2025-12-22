import { type ApiPromise } from '@polkadot/api';
import { type GraphQLClient } from 'graphql-request';

import { type Chain, type ChainId, type DecodedTransaction } from '@/shared/core';
import { dictionary, toAccountId } from '@/shared/lib/utils';
import { proxyPallet } from '@/shared/pallet/proxy';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type MultisigOperation } from '@/domains/network';
import { networkUtils } from '@/entities/network';

import { FILTER_MULTISIG_ACCOUNT_IDS } from './graphql/queries/multisigs';

export const multisigService = {
  filterMultisigsAccounts,
  findFlexibleMultisigs,
  getUniqMultisigs,
  isFlexibleMultisigOperation,
};

export type MultisigResult = {
  accountId: AccountId;
  name?: string;
  threshold: number;
  signatories: AccountId[];
  chain: Chain;
  proxied?: {
    accountId: AccountId;
    proxyAccountId: AccountId;
    proxyType: 'Any';
    delay: number;
  };
};

async function filterMultisigsAccounts(
  client: GraphQLClient,
  accountIds: AccountId[],
  chain: Chain,
): Promise<MultisigResult[]> {
  try {
    const data = await client.request(FILTER_MULTISIG_ACCOUNT_IDS, { accountIds });

    const filteredMultisigs = (data as any)?.accounts?.nodes?.map(({ id, threshold, signatories }: any) => ({
      accountId: id,
      threshold,
      signatories: signatories.nodes.map(({ signatory }: any) => signatory.id),
      chain,
    }));

    return filteredMultisigs || [];
  } catch {
    return [];
  }
}

function getUniqMultisigs(results: MultisigResult[]): MultisigResult[] {
  const existing = new Set<AccountId>();
  const filtered: MultisigResult[] = [];

  for (const multisig of results) {
    if (existing.has(multisig.accountId)) {
      continue;
    }
    existing.add(multisig.accountId);
    filtered.push(multisig);
  }

  return filtered;
}

async function findFlexibleMultisigs(
  apis: Record<ChainId, ApiPromise>,
  multisigs: MultisigResult[],
): Promise<MultisigResult[]> {
  const flexMultisigs = new Map();

  const multisigChains = multisigs.reduce<ChainId[]>((acc, m) => {
    if (acc.includes(m.chain.chainId) || !networkUtils.isPureProxySupported(m.chain.options)) return acc;

    acc.push(m.chain.chainId);
    return acc;
  }, []);

  const multisigMap = dictionary(multisigs, 'accountId');

  // check flexible multisigs for proxies
  const proxyEntries = await Promise.all(
    multisigChains.map(async (chainId) => {
      const entries = await proxyPallet.storage.proxies(apis[chainId]);

      return { chainId, entries };
    }),
  );

  for (const { chainId, entries } of proxyEntries) {
    if (entries.length === 0) continue;

    for (const { account, value } of entries) {
      const proxyMultisigAccount = value.proxies.at(0);
      const multisigAccountId = proxyMultisigAccount?.delegate;
      const id = `${chainId}-${multisigAccountId}`;

      if (!multisigAccountId || !multisigMap[multisigAccountId]) continue;

      if (flexMultisigs.get(id) || value.proxies.length !== 1 || proxyMultisigAccount.proxyType !== 'Any') {
        flexMultisigs.delete(id);
        continue;
      }

      flexMultisigs.set(id, {
        ...multisigMap[multisigAccountId],
        proxied: {
          proxyAccountId: multisigAccountId,
          accountId: account,
          proxyType: proxyMultisigAccount.proxyType,
          delay: proxyMultisigAccount.delay,
        },
      });
    }
  }

  return [...Array.from(flexMultisigs.values())];
}

/**
 * Checks if an operation belongs to a flexible multisig account. Handles both
 * direct proxy.proxy calls and Nova Wallet's utility.batchAll wrapper.
 */
function isFlexibleMultisigOperation(operation: MultisigOperation, flexibleMultisigAccountId: AccountId): boolean {
  const isProxyTx =
    operation.method === 'proxy' &&
    operation.section === 'proxy' &&
    flexibleMultisigAccountId === toAccountId(operation.transaction?.args.real);

  if (isProxyTx) return true;

  // Nova Wallet wraps proxy calls inside utility.batchAll transactions instead of sending direct proxy.proxy calls.
  const transactions = operation.transaction?.args.transactions;

  return (
    operation.method === 'batchAll' &&
    operation.section === 'utility' &&
    Array.isArray(transactions) &&
    transactions.every((t: DecodedTransaction) => t.args.real && flexibleMultisigAccountId === toAccountId(t.args.real))
  );
}
