import { type ApiPromise } from '@polkadot/api';
import { type GraphQLClient } from 'graphql-request';

import { type CallHash, type Chain, type ChainId } from '@/shared/core';
import { TransactionType } from '@/shared/core';
import { dictionary, validateCallData } from '@/shared/lib/utils';
import { proxyPallet } from '@/shared/pallet/proxy';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { networkUtils } from '@/entities/network';
import { decodeCallData } from '@/entities/transaction';
import {
  DEFAULT_BLOCK_HASH,
  MULTISIG_EXTRINSIC_CALL_INDEX,
  type PendingMultisigTransaction,
  getPendingMultisigTxs,
} from '../lib';

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

// TODO: can be deleted after a new indexer will be added
type GetCallDataParams = {
  api: ApiPromise;
  callHash: CallHash;
  blockHeight: number;
  extrinsicIndex: number;
  accountId: AccountId;
};
const getTransactionFromChain = async ({
  api,
  callHash,
  blockHeight,
  extrinsicIndex,
  accountId,
}: GetCallDataParams) => {
  try {
    const blockHash = await api.rpc.chain.getBlockHash(blockHeight);
    if (blockHash.toHex() === DEFAULT_BLOCK_HASH) return null;

    const { block } = await api.rpc.chain.getBlock(blockHash);
    const extrinsic = block.extrinsics[extrinsicIndex];

    if (!extrinsic.argsDef.call) return null;

    const callData = extrinsic.args[MULTISIG_EXTRINSIC_CALL_INDEX].toHex();

    if (!validateCallData(callData, callHash)) return null;

    return decodeCallData(api, accountId, callData);
  } catch (e) {
    console.warn('Error during update call data from chain', e);

    return null;
  }
};

async function isCreateProxyTransaction(
  api: ApiPromise,
  tx: PendingMultisigTransaction,
  accountId: AccountId,
): Promise<boolean> {
  const transaction = await getTransactionFromChain({
    api,
    callHash: tx.callHash.toHex(),
    blockHeight: tx.params.when.height.toNumber(),
    extrinsicIndex: tx.params.when.index.toNumber(),
    accountId,
  });

  return transaction?.type === TransactionType.CREATE_PURE_PROXY;
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
        const isProxyTx = await isCreateProxyTransaction(api, txs[0], mult.accountId);
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
      const proxyMultisigAccount = value.accounts.at(0);
      const multisigAccountId = proxyMultisigAccount?.delegate;
      const id = `${chainId}-${multisigAccountId}`;

      if (!multisigAccountId || !multisigMap[multisigAccountId]) continue;

      // For flexible multisig shell creation, the multisig should have no proxy
      if (shellFlexibleMultisigs.has(id)) {
        shellFlexibleMultisigs.delete(id);
        continue;
      }

      if (flexMultisigs.get(id) || value.accounts.length !== 1 || proxyMultisigAccount.proxyType !== 'Any') {
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
