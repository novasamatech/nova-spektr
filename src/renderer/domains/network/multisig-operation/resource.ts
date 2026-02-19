import { gql } from '@apollo/client';
import { type ApiPromise } from '@polkadot/api';
import { type QueryableStorageMultiArg } from '@polkadot/api/types';
import { type Option } from '@polkadot/types';
import { type PalletMultisigMultisig } from '@polkadot/types/lookup';
import { createStore, sample } from 'effector';
import { GraphQLClient } from 'graphql-request';
import { produce } from 'immer';
import { z } from 'zod';

import { type Chain, type ChainId, type DecodedTransaction, type HexString } from '@/shared/core';
import {
  entries,
  getCreatedDateFromApi,
  getNativeAssetId,
  nonNullable,
  nullable,
  toAccountId,
  validateCallData,
} from '@/shared/lib/utils';
import { multisigPallet } from '@/shared/pallet/multisig';
import { polkadotjsHelpers } from '@/shared/polkadotjs-helpers';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';
import { createQueryResource, createSubscriptionResource } from '@/shared/query';
import { type MapCacheFn } from '@/shared/query/types';
import { decodeCallData } from '@/entities/transaction';

import { INDEXER_URL } from './constants';
import { multisigOperationService } from './service';
import { type MultisigEvent, type MultisigOperation } from './types';

type CreateOperationParams = {
  api: ApiPromise;
  chain: Chain;
  accountId: AccountId;
  callHash: HexString;
  multisig: PalletMultisigMultisig;
};

async function createOperationFromMultisig({
  api,
  chain,
  accountId,
  callHash,
  multisig,
}: CreateOperationParams): Promise<MultisigOperation> {
  const chainId = chain.chainId;
  const nativeAssetId = getNativeAssetId(chain.assets);
  const blockHeight = multisig.when.height.toNumber();
  const extrinsicIndex = multisig.when.index.toNumber();
  const multisigAccountId = toAccountId(accountId.toString());

  const timestamp = await getCreatedDateFromApi(blockHeight, api);
  const operationId = multisigOperationService.getOperationId(
    chainId,
    callHash,
    multisigAccountId,
    blockHeight,
    extrinsicIndex,
  );

  const events = multisig.approvals.map<MultisigEvent>(approver => ({
    id: multisigOperationService.getEventId(operationId, approver.toString(), 'approve'),
    chainId,
    accountId: toAccountId(approver.toString()),
    status: 'approve',
    callHash,
    blockCreated: pjsSchema.helpers.toBlockHeight(blockHeight),
    indexCreated: extrinsicIndex,
    timestamp,
  }));

  const transaction = await multisigOperationService.getTransactionFromChain({
    api,
    callHash,
    blockHeight,
    extrinsicIndex,
  });

  const callData = transaction?.method.toHex() || null;

  let decodedTransaction: DecodedTransaction | null = null;
  try {
    if (callData && validateCallData(callData, callHash)) {
      decodedTransaction = decodeCallData(api, multisigAccountId, callData, nativeAssetId);
    }
  } catch (error) {
    console.warn('Failed to decode call data', { callHash, error });
  }

  const isProxyCall = decodedTransaction?.section === 'proxy' && decodedTransaction?.method === 'proxy';
  console.log({ isProxyCall, decodedTransaction });
  const proxiedAccountId = isProxyCall && decodedTransaction ? toAccountId(decodedTransaction.args['real']) : undefined;

  return {
    id: operationId,
    chainId,
    status: 'pending',
    multisigAccountId,
    ...(proxiedAccountId ? { proxiedAccountId } : {}),
    callHash,
    callData,
    depositor: toAccountId(multisig.depositor.toString()),
    blockCreated: pjsSchema.helpers.toBlockHeight(blockHeight),
    indexCreated: extrinsicIndex,
    deposit: multisig.deposit,
    method: transaction?.method?.method ?? null,
    section: transaction?.method?.section ?? null,
    timestamp,
    events,
    transaction: decodedTransaction,
  };
}

const operationsGqlSchema = z.object({
  timestamp: z.number().transform(value => value * 1000),
  status: z.enum(['pending', 'cancelled', 'executed', 'error']),
  blockCreated: z.number().transform(pjsSchema.helpers.toBlockHeight),
  indexCreated: z.number(),
  accountId: z.string().transform(pjsSchema.helpers.toAccountId),
  chainId: z.string().transform(x => x as ChainId),
  depositor: z.string().transform(pjsSchema.helpers.toAccountId),
  callHash: z.string().transform(x => x as HexString),
  callData: z
    .string()
    .transform(x => x as HexString)
    .nullable(),
  method: z.string().nullable(),
  section: z.string().nullable(),
  events: z.object({
    nodes: z.array(
      z.object({
        accountId: z.string().transform(pjsSchema.helpers.toAccountId),
        status: z.enum(['approve', 'reject']),
        blockCreated: z.number().transform(pjsSchema.helpers.toBlockHeight),
        indexCreated: z.number(),
        timestamp: z.number().transform(value => value * 1000),
      }),
    ),
  }),
});

const multisigEvent = z.union([
  pjsSchema.tupleMap(
    ['accountId', pjsSchema.accountId],
    ['timepoint', multisigPallet.schema.multisigTimepoint],
    ['multisigAccountId', pjsSchema.accountId],
    ['callHash', pjsSchema.rawString],
  ),
  pjsSchema.tupleMap(
    ['accountId', pjsSchema.accountId],
    ['timepoint', multisigPallet.schema.multisigTimepoint],
    ['multisigAccountId', pjsSchema.accountId],
    ['callHash', pjsSchema.rawString],
    ['status', pjsSchema.enumType('Ok', 'Basic', 'Empty', 'Err', 'None')],
  ),
]);

const operationsQuery = gql`
  query List($accountIds: [String!]!) {
    multisigOperations(filter: { accountId: { in: $accountIds }, status: { notEqualTo: pending } }) {
      nodes {
        status
        accountId
        chainId
        callHash
        callData
        depositor
        blockCreated
        indexCreated
        timestamp
        method
        section
        events {
          nodes {
            accountId
            status
            blockCreated
            indexCreated
            timestamp
          }
        }
      }
    }
  }
`;

function mapSubqueryOperationRecord(
  node: unknown,
  apis: Record<ChainId, ApiPromise>,
  chains: Record<ChainId, Chain>,
): MultisigOperation | null {
  const response = operationsGqlSchema.parse(node);
  const multisigAccountId = response.accountId;
  const operationId = multisigOperationService.getOperationId(
    response.chainId,
    response.callHash,
    multisigAccountId,
    response.blockCreated,
    response.indexCreated,
  );
  const api = apis[response.chainId];
  const chain = chains[response.chainId];

  if (nullable(api) || nullable(chain)) return null;

  let transaction: DecodedTransaction | null = null;

  try {
    if (response.callData && validateCallData(response.callData, response.callHash)) {
      transaction = decodeCallData(api, multisigAccountId, response.callData, getNativeAssetId(chain.assets));
    }
  } catch (error) {
    console.warn('Failed to decode call data from indexer response', { callHash: response.callHash, error });
  }

  const isProxyCall = transaction?.section === 'proxy' && transaction?.method === 'proxy';
  const proxiedAccountId = isProxyCall && transaction ? toAccountId(transaction.args['real']) : undefined;

  return {
    id: operationId,
    transaction,
    section: response.section,
    method: response.method,
    timestamp: response.timestamp,
    multisigAccountId,
    ...(proxiedAccountId ? { proxiedAccountId } : {}),
    callHash: response.callHash,
    callData: response.callData ?? null,
    blockCreated: response.blockCreated,
    indexCreated: response.indexCreated,
    status: response.status,
    depositor: response.depositor,
    events: response.events.nodes.map(event => {
      return {
        ...event,
        id: multisigOperationService.getEventId(operationId, event.accountId, event.status),
      };
    }),
    chainId: api.genesisHash.toHex(),
  };
}

async function fetchOperationsHistory(
  accountIds: AccountId[],
  apis: Record<ChainId, ApiPromise>,
  chains: Record<ChainId, Chain>,
): Promise<MultisigOperation[]> {
  const client = new GraphQLClient(INDEXER_URL);
  const result = await client.request<any, { accountIds: AccountId[] }>(operationsQuery, { accountIds });

  return result.multisigOperations.nodes
    .map((node: unknown) => mapSubqueryOperationRecord(node, apis, chains))
    .filter(nonNullable);
}

type OffChainRequestParams = {
  apis: Record<ChainId, ApiPromise>;
  chains: Record<ChainId, Chain>;
  accountIds: AccountId[];
};

type OnChainRequestParams = {
  api: ApiPromise;
  chain: Chain;
  accountIds: AccountId[];
};

export const $offChainOperations = createStore<MultisigOperation[]>([]);

// Shared store for on-chain operations (updated by initialOnChainFetch + subscribeOnchainResource)
type OnChainOperationsState = Record<ChainId, Record<AccountId, Record<HexString, MultisigOperation | null>>>;
export const $onChainOperationsByCallhash = createStore<OnChainOperationsState>({});

// Shared store for tracked call hashes (updated by initialOnChainFetch + subscribeNewMultisigEventsResource)
type TrackedCallHashesState = Record<ChainId, { api: ApiPromise; hashes: Record<AccountId, HexString[]> }>;
export const $trackedCallHashes = createStore<TrackedCallHashesState>({});

const offChainCacheMapper: MapCacheFn<OffChainRequestParams, MultisigOperation[], MultisigOperation[]> = (
  cache,
  operations,
  { accountIds },
) => {
  const operationsWithoutGivenAccounts = cache.filter(o => !accountIds.includes(o.multisigAccountId));
  return multisigOperationService.mergeMultisigOperations(operationsWithoutGivenAccounts, operations);
};

export const fetchOffchainResource = createQueryResource<OffChainRequestParams>({
  key: ({ accountIds }) => accountIds.join('-'),
})
  .request(async ({ apis, accountIds, chains }) => {
    return fetchOperationsHistory(accountIds, apis, chains);
  })
  .cache({
    store: $offChainOperations,
    map: offChainCacheMapper,
  })
  .build();

export const initialOnChainFetch = createQueryResource<OnChainRequestParams>({
  key: ({ api, accountIds }) => accountIds.join('-') + api.genesisHash.toHex(),
})
  .request(async ({ api, accountIds, chain }) => {
    const chainId = api.genesisHash.toHex();
    const callHashesByAccount: Record<AccountId, HexString[]> = {};
    const onChainData: Record<AccountId, Record<HexString, MultisigOperation>> = {};

    // Phase 1: Fetch all keys for all accounts in parallel (N parallel RPC calls)
    // Using keys() instead of entries() - we'll batch the value fetches in phase 2
    const keysResults = await Promise.allSettled(
      accountIds.map(async accountId => {
        const keys = await api.query.multisig.multisigs.keys(accountId);
        return { accountId, keys };
      }),
    );

    type KeyData = { accountId: AccountId; callHash: HexString };
    const allKeyData: KeyData[] = [];

    let failedCount = 0;
    for (const result of keysResults) {
      if (result.status === 'fulfilled') {
        const { accountId, keys } = result.value;
        callHashesByAccount[accountId] = [];

        for (const key of keys) {
          const callHash = key.args[1].toHex();
          callHashesByAccount[accountId].push(callHash);
          allKeyData.push({ accountId, callHash });
        }
      } else {
        failedCount++;
        console.warn(`Failed to fetch keys for account on chain ${chainId}:`, result.reason);
      }
    }

    if (failedCount === keysResults.length && keysResults.length > 0) {
      throw new Error(`All key fetches failed for chain ${chainId}`);
    }

    if (allKeyData.length === 0) {
      return { chainId, callHashesByAccount, onChainData };
    }

    // Phase 2: Fetch all values in a single batched multi() call (1 RPC call)
    // This replaces N separate value fetches with one batched request
    const multiArgs = allKeyData.map(({ accountId, callHash }) => [accountId, callHash] as const);
    const values = await api.query.multisig.multisigs.multi(multiArgs);

    // Phase 3: Process all operations in parallel
    const operationResults = await Promise.allSettled(
      allKeyData.map(async ({ accountId, callHash }, index) => {
        const optionalMultisig = values[index];

        if (optionalMultisig && optionalMultisig.isSome) {
          const multisig = optionalMultisig.unwrap();
          try {
            const operation = await createOperationFromMultisig({
              api,
              chain,
              accountId,
              callHash,
              multisig,
            });
            return { accountId, callHash, operation };
          } catch (error) {
            console.warn(`Failed to process operation ${callHash}:`, error);
            return null;
          }
        }
        return null;
      }),
    );

    // Collect successful operations
    for (const result of operationResults) {
      if (result.status === 'fulfilled' && result.value?.operation) {
        const { accountId, callHash, operation } = result.value;
        if (!onChainData[accountId]) {
          onChainData[accountId] = {};
        }
        onChainData[accountId][callHash] = operation;
      }
    }

    return {
      chainId,
      callHashesByAccount,
      onChainData,
    };
  })
  .retry({ count: 3, delay: 1000 })
  .cache({
    store: $onChainOperationsByCallhash,
    map: (cache, { chainId, onChainData }) => {
      return produce(cache, draft => {
        if (!draft[chainId]) {
          draft[chainId] = {};
        }
        for (const [accountId, operations] of entries(onChainData)) {
          if (!draft[chainId][accountId]) {
            draft[chainId][accountId] = {};
          }
          for (const [callHash, operation] of entries(operations)) {
            draft[chainId][accountId][callHash] = operation;
          }
        }
      });
    },
  })
  .build();

// Sample for initialOnChainFetch to update $trackedCallHashes
// (resource can only have one cache, so this requires a sample block)
sample({
  clock: initialOnChainFetch.push,
  source: $trackedCallHashes,
  fn: (state, { params, result: { chainId, callHashesByAccount } }) => {
    const { api, accountIds } = params;
    return produce(state, draft => {
      const existing = draft[chainId] || { api, hashes: {} };
      const newHashesMap = { ...existing.hashes };

      for (const accountId of accountIds) {
        newHashesMap[accountId] = callHashesByAccount[accountId] || [];
      }

      draft[chainId] = {
        api,
        hashes: newHashesMap,
      };
    });
  },
  target: $trackedCallHashes,
});

export const subscribeOnchainResource = createSubscriptionResource<{
  api: ApiPromise;
  hashes: Record<AccountId, HexString[]>;
  chain: Chain;
}>({
  key: ({ api }) => api.genesisHash.toHex(),
  recreateOnSubscribe: true,
})
  .subscribe<{ chainId: ChainId; operations: Record<AccountId, Record<HexString, MultisigOperation | null>> }>(
    async ({ chain, api, hashes }, callback) => {
      const chainId = chain.chainId;
      const queries: QueryableStorageMultiArg<'promise'>[] = [];
      const paths: { accountId: AccountId; callHash: HexString }[] = [];

      for (const [accountId, callHashes] of entries(hashes)) {
        for (const callHash of callHashes) {
          queries.push([api.query.multisig.multisigs, [accountId, callHash]]);
          paths.push({ accountId, callHash });
        }
      }

      return await api.queryMulti(queries, async (results: Option<PalletMultisigMultisig>[]) => {
        const onChainData: Record<AccountId, Record<HexString, MultisigOperation | null>> = {};

        for (let index = 0; index < results.length; index++) {
          const optionalMultisig = results[index]!;
          const { accountId, callHash } = paths[index]!;

          if (!onChainData[accountId]) {
            onChainData[accountId] = {};
          }

          if (optionalMultisig.isNone) {
            onChainData[accountId][callHash] = null;
          } else {
            const multisig = optionalMultisig.unwrap();

            onChainData[accountId][callHash] = await createOperationFromMultisig({
              api,
              chain,
              accountId,
              callHash,
              multisig,
            });
          }
        }

        callback({ chainId, operations: onChainData });
      });
    },
  )
  .build();

export const subscribeNewMultisigEventsResource = createSubscriptionResource<{
  api: ApiPromise;
  accountId: AccountId;
}>({
  key: ({ api, accountId }) => `${api.genesisHash.toHex()}-${accountId}`,
})
  .subscribe<HexString>(async ({ api, accountId }, callback) => {
    const unsubscribeNewMultisig = await polkadotjsHelpers.subscribeSystemEvents(
      { api, section: 'multisig', methods: ['NewMultisig'] },
      event => {
        if (api.events.multisig.NewMultisig.is(event)) {
          const [_, multisigAccount, callHash] = event.data;

          // Check if this multisig belongs to current user
          if (accountId === toAccountId(multisigAccount.toString())) {
            callback(callHash.toHex());
          }
        }
      },
    );

    return () => {
      unsubscribeNewMultisig();
    };
  })
  .cache({
    store: $trackedCallHashes,
    map: (cache, newCallHash, { api, accountId }) => {
      return produce(cache, draft => {
        const chainId = api.genesisHash.toHex();

        // Ensure the chain entry exists (fixes race condition when NewMultisig arrives before initialOnChainFetch)
        if (!draft[chainId]) {
          draft[chainId] = { api, hashes: {} };
        }

        // Ensure the account hashes array exists
        if (!draft[chainId].hashes[accountId]) {
          draft[chainId].hashes[accountId] = [];
        }

        draft[chainId].hashes[accountId]!.push(newCallHash);
      });
    },
  })
  .build();

export const $completionEvents = createStore<{ chainId: ChainId; operationId: string; event: MultisigEvent }[]>([]);

export const subscribeEventsResource = createSubscriptionResource<{
  api: ApiPromise;
  accountId: AccountId;
}>({
  key: ({ api, accountId }) => `${api.genesisHash.toHex()}-${accountId}`,
})
  .subscribe<{ event: MultisigEvent; operationId: string }>(async ({ api, accountId }, callback) => {
    return await polkadotjsHelpers.subscribeSystemEvents(
      { api, section: 'multisig', methods: ['MultisigApproval', 'MultisigExecuted', 'MultisigCancelled'] },
      event => {
        const data = multisigEvent.parse(event.data);

        if (data.multisigAccountId !== accountId) return;

        const operationId = multisigOperationService.getOperationId(
          api.genesisHash.toHex(),
          data.callHash,
          data.multisigAccountId,
          data.timepoint.height,
          data.timepoint.index,
        );

        const eventStatus = event.method === 'MultisigCancelled' ? 'reject' : 'approve';

        callback({
          operationId,
          event: {
            id: multisigOperationService.getEventId(operationId, data.accountId, eventStatus),
            accountId: data.accountId,
            status: eventStatus,
            indexCreated: data.timepoint.index,
            blockCreated: data.timepoint.height,
            timestamp: Date.now(),
          },
        });
      },
    );
  })
  .cache({
    store: $completionEvents,
    map: (state, { event, operationId }, { api }) => {
      return [...state, { chainId: api.genesisHash.toHex(), operationId, event }];
    },
  })
  .build();
