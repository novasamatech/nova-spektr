import { type ApiPromise } from '@polkadot/api';
import { type GraphQLClient } from 'graphql-request';

import { type Chain, type ChainId } from '@/shared/core';
import { TransactionType } from '@/shared/core';
import { dictionary } from '@/shared/lib/utils';
import { proxyPallet } from '@/shared/pallet/proxy';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { multisigOperationService } from '@/domains/network';
import { networkUtils } from '@/entities/network';
import { getTransactionType } from '@/entities/transaction';
import { type PendingMultisigTransaction, getPendingMultisigTxs } from '../lib';

import { FILTER_MULTISIG_ACCOUNT_IDS } from './graphql/queries/multisigs';

export const multisigService = {
  filterMultisigsAccounts,
  findFlexibleMultisigs,
  getUniqMultisigs,
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

async function isCreateProxyTransaction(api: ApiPromise, tx: PendingMultisigTransaction): Promise<boolean> {
  const transaction = await multisigOperationService.getTransactionFromChain({
    api,
    callHash: tx.callHash.toHex(),
    blockHeight: tx.params.when.height.toNumber(),
    extrinsicIndex: tx.params.when.index.toNumber(),
  });

  const transactionType = transaction
    ? getTransactionType(transaction?.method.method, transaction?.method.section)
    : null;

  return transactionType === TransactionType.CREATE_PURE_PROXY;
}

async function findShellMultisigs(
  apis: Record<ChainId, ApiPromise>,
  multisigs: MultisigResult[],
): Promise<Map<string, MultisigResult>> {
  const shellFlexibleMultisigs = new Map();

  await Promise.allSettled(
    multisigs.map(async (mult) => {
      const id = `${mult.chain.chainId}-${mult.accountId}`;
      const api = apis[mult.chain.chainId];

      const txs = await getPendingMultisigTxs(api, mult.accountId);

      // if mutisig has only one operation and this operation is create pure proxy - this can be a shell
      if (txs.length === 1) {
        const isProxyTx = await isCreateProxyTransaction(api, txs[0]);
        if (isProxyTx) {
          shellFlexibleMultisigs.set(id, mult);

          return;
        }
      }
    }),
  );

  return shellFlexibleMultisigs;
}

async function findFlexibleMultisigs(
  apis: Record<ChainId, ApiPromise>,
  multisigs: MultisigResult[],
): Promise<MultisigResult[]> {
  const flexMultisigs = new Map();
  const shellFlexibleMultisigs = await findShellMultisigs(apis, multisigs);

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

      // For flexible multisig shell creation, the multisig should have no proxy
      if (shellFlexibleMultisigs.has(id)) {
        shellFlexibleMultisigs.delete(id);
        continue;
      }

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

  return [...Array.from(flexMultisigs.values()), ...Array.from(shellFlexibleMultisigs.values())];
}
