import { type ApiPromise } from '@polkadot/api';
import { type GraphQLClient } from 'graphql-request';

import { type CallHash, type Chain, type ChainId } from '@/shared/core';
import { TransactionType } from '@/shared/core';
import { nonNullable, validateCallData } from '@/shared/lib/utils';
import { proxyPallet } from '@/shared/pallet/proxy';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { getDataFromCallData, getTransactionType } from '@/entities/transaction';
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
  getTransactionFromChain,
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
  const data = await client.request(FILTER_MULTISIG_ACCOUNT_IDS, { accountIds });

  const filteredMultisigs = (data as any)?.accounts?.nodes?.map(({ id, threshold, signatories }: any) => ({
    accountId: id,
    threshold,
    signatories: signatories.nodes.map(({ signatory }: any) => signatory.id),
    chain,
  }));

  return filteredMultisigs || [];
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

    if (!extrinsic.argsDef.call) return null;

    const callData = extrinsic.args[MULTISIG_EXTRINSIC_CALL_INDEX].toHex();

    if (!validateCallData(callData, callHash)) return null;

    return getDataFromCallData(api, callData);
  } catch (e) {
    console.warn('Error during update call data from chain', e);

    return null;
  }
}

async function isCreateProxyTransaction(api: ApiPromise, tx: PendingMultisigTransaction): Promise<boolean> {
  const transaction = await getTransactionFromChain({
    api,
    callHash: tx.callHash.toHex(),
    blockHeight: tx.params.when.height.toNumber(),
    extrinsicIndex: tx.params.when.index.toNumber(),
  });

  const transactionType = getTransactionType(transaction?.method, transaction?.section);

  return transactionType === TransactionType.CREATE_PURE_PROXY;
}

async function categorizeMultisigs(
  apis: Record<ChainId, ApiPromise>,
  multisigs: MultisigResult[],
): Promise<{
  flexMultisigs: Map<string, MultisigResult>;
  shellFlexibleMultisigs: Map<string, MultisigResult>;
  regularMultisigs: MultisigResult[];
  apiMap: Map<ChainId, ApiPromise>;
}> {
  const flexMultisigs = new Map();
  const shellFlexibleMultisigs = new Map();
  const regularMultisigs: MultisigResult[] = [];
  const apiMap = new Map<ChainId, ApiPromise>();

  await Promise.all(
    multisigs.map(async (mult) => {
      const id = `${mult.chain.chainId}-${mult.accountId}`;
      const api = apis[mult.chain.chainId];

      const txs = await getPendingMultisigTxs(api, mult.accountId);

      if (txs.length === 0) {
        flexMultisigs.set(id, mult);
        apiMap.set(mult.chain.chainId, api);

        return;
      } else if (txs.length === 1) {
        const isProxyTx = await isCreateProxyTransaction(api, txs[0]);
        if (isProxyTx) {
          shellFlexibleMultisigs.set(id, mult);
          apiMap.set(mult.chain.chainId, api);

          return;
        }
      }

      regularMultisigs.push(mult);
    }),
  );

  return { flexMultisigs, shellFlexibleMultisigs, regularMultisigs, apiMap };
}

export type FilteredMultisigParams = {
  regularMultisigs: MultisigResult[];
  flexibleMultisigs: MultisigResult[];
};

async function findFlexibleMultisigs(
  apis: Record<ChainId, ApiPromise>,
  multisigs: MultisigResult[],
): Promise<FilteredMultisigParams> {
  const { flexMultisigs, shellFlexibleMultisigs, regularMultisigs, apiMap } = await categorizeMultisigs(
    apis,
    multisigs,
  );

  if (shellFlexibleMultisigs.size === 0 && flexMultisigs.size === 0) {
    return { regularMultisigs, flexibleMultisigs: [] };
  }

  // check potential flexible multisigs for proxies
  const proxyEntries = await Promise.all(
    Array.from(apiMap.entries()).map(async ([chainId, api]) => {
      const entries = await proxyPallet.storage.proxies(api);

      return { chainId, entries };
    }),
  );

  for (const { chainId, entries } of proxyEntries) {
    if (entries.length === 0) continue;

    for (const { account, value } of entries) {
      const proxyMultisigAccount = value.accounts.at(0);
      const id = `${chainId}-${proxyMultisigAccount?.delegate}`;

      if (!proxyMultisigAccount || (!flexMultisigs.has(id) && !shellFlexibleMultisigs.has(id))) continue;

      // For flexible multisig shell creation, the multisig should have no proxy
      if (shellFlexibleMultisigs.has(id)) {
        regularMultisigs.push(shellFlexibleMultisigs.get(id)!);
        shellFlexibleMultisigs.delete(id);
        continue;
      }

      const flex = flexMultisigs.get(id);
      if (!flex) continue;

      if (value.accounts.length !== 1 || proxyMultisigAccount.proxyType !== 'Any' || nonNullable(flex?.proxied)) {
        regularMultisigs.push(flex);
        flexMultisigs.delete(id);

        continue;
      }

      flexMultisigs.set(id, {
        ...flex,
        proxied: {
          proxyAccountId: flex.accountId,
          accountId: account,
          proxyType: proxyMultisigAccount.proxyType,
          delay: proxyMultisigAccount.delay,
        },
      });
    }
  }

  const filteredFlex = Array.from(flexMultisigs.values()).filter((flex) => {
    if (flex.proxied) return true;

    regularMultisigs.push(flex);

    return false;
  });

  return {
    regularMultisigs,
    flexibleMultisigs: [...filteredFlex, ...Array.from(shellFlexibleMultisigs.values())],
  };
}
