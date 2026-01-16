import { gql } from '@apollo/client';
import { type ApiPromise } from '@polkadot/api';
import { type QueryableStorageMultiArg } from '@polkadot/api/types';
import { type Option } from '@polkadot/types';
import { type PalletMultisigMultisig } from '@polkadot/types/lookup';
import { GraphQLClient } from 'graphql-request';
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
import { createSubscriptionResource as createQuerySubscriptionResource } from '@/shared/query';
import { createRemoteResource, createSubscriptionResource } from '@/shared/resource';
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
  const chainId = api.genesisHash.toHex();
  const nativeAssetId = getNativeAssetId(chain.assets);
  const blockHeight = multisig.when.height.toNumber();
  const extrinsicIndex = multisig.when.index.toNumber();

  const timestamp = await getCreatedDateFromApi(blockHeight, api);
  const operationId = multisigOperationService.getOperationId(
    chainId,
    callHash,
    accountId,
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
      decodedTransaction = decodeCallData(api, accountId, callData, nativeAssetId);
    }
  } catch {
    // do nothing
  }

  return {
    id: operationId,
    chainId,
    status: 'pending',
    accountId: toAccountId(accountId.toString()),
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
  query List($accountId: String!) {
    multisigOperations(filter: { accountId: { equalTo: $accountId }, status: { notEqualTo: pending } }) {
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
  const operationId = multisigOperationService.getOperationId(
    response.chainId,
    response.callHash,
    response.accountId,
    response.blockCreated,
    response.indexCreated,
  );
  const api = apis[response.chainId];
  const chain = chains[response.chainId];

  if (nullable(api) || nullable(chain)) return null;

  let transaction: DecodedTransaction | null = null;

  try {
    if (response.callData && validateCallData(response.callData, response.callHash)) {
      transaction = decodeCallData(api, response.accountId, response.callData, getNativeAssetId(chain.assets));
    }
  } catch {
    // do nothing
  }

  return {
    id: operationId,
    transaction,
    section: response.section,
    method: response.method,
    timestamp: response.timestamp,
    accountId: response.accountId,
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
  accountId: AccountId,
  apis: Record<ChainId, ApiPromise>,
  chains: Record<ChainId, Chain>,
): Promise<MultisigOperation[]> {
  const client = new GraphQLClient(INDEXER_URL);
  const result = await client.request<any, { accountId: AccountId }>(operationsQuery, { accountId });

  return result.multisigOperations.nodes
    .map((node: unknown) => mapSubqueryOperationRecord(node, apis, chains))
    .filter(nonNullable);
}

const fetchOnchainOperations = async (api: ApiPromise, accountId: AccountId, chain: Chain) => {
  const operations: MultisigOperation[] = [];
  const chainId = api.genesisHash.toHex();
  const response = await multisigPallet.storage.multisigs(api, accountId);
  const nativeAssetId = getNativeAssetId(chain.assets);

  for (const { key, multisig } of response) {
    if (nullable(multisig)) continue;

    const timestamp = await getCreatedDateFromApi(multisig.when.height, api);
    const operationId = multisigOperationService.getOperationId(
      chainId,
      key.callHash,
      key.accountId,
      multisig.when.height,
      multisig.when.index,
    );

    const events = multisig.approvals.map<MultisigEvent>(accountId => ({
      id: multisigOperationService.getEventId(operationId, accountId, 'approve'),
      chainId,
      accountId,
      status: 'approve',
      callHash: key.callHash,
      blockCreated: multisig.when.height,
      indexCreated: multisig.when.index,
      timestamp,
    }));

    const transaction = await multisigOperationService.getTransactionFromChain({
      api,
      callHash: key.callHash as HexString,
      blockHeight: multisig.when.height,
      extrinsicIndex: multisig.when.index,
    });

    const callData = transaction?.method.toHex() || null;

    let decodedTransaction: DecodedTransaction | null = null;
    try {
      if (callData && validateCallData(callData, key.callHash)) {
        decodedTransaction = callData ? decodeCallData(api, accountId, callData, nativeAssetId) : null;
      }
    } catch {
      // do nothing
    }

    operations.push({
      id: operationId,
      chainId,
      status: 'pending',
      accountId: key.accountId,
      callHash: key.callHash as HexString,
      callData,
      depositor: multisig.depositor,
      blockCreated: multisig.when.height,
      indexCreated: multisig.when.index,
      deposit: multisig.deposit,
      method: transaction?.method?.method ?? null,
      section: transaction?.method?.section ?? null,
      timestamp,
      events,
      transaction: decodedTransaction,
    });
  }

  return operations;
};

const fetchAllOnchainOperations = async (
  apis: Record<ChainId, ApiPromise>,
  accountId: AccountId,
  chains: Record<ChainId, Chain>,
) => {
  const requests = Object.values(apis).map(api =>
    fetchOnchainOperations(api, accountId, chains[api.genesisHash.toHex()]!),
  );
  const operations = await Promise.allSettled(requests);

  return operations.map(result => (result.status === 'fulfilled' ? result.value : [])).flat();
};

type RequestParams = {
  apis: Record<ChainId, ApiPromise>;
  chains: Record<ChainId, Chain>;
  accountId: AccountId;
};

export const fetchOffchainResource = createRemoteResource<RequestParams, MultisigOperation[]>({
  async fn({ apis, accountId, chains }) {
    return fetchOperationsHistory(accountId, apis, chains);
  },
});

//this resource is only being used for deep links, not actually merged into the list of operations
export const fetchAllOperationsResource = createRemoteResource<RequestParams, MultisigOperation[]>({
  async fn({ apis, accountId, chains }) {
    const chainOperations = fetchAllOnchainOperations(apis, accountId, chains);
    const historicOperations = fetchOffchainResource.request({ apis, accountId, chains });
    const [chainOperationsResult, historicOperationsResult] = await Promise.all([chainOperations, historicOperations]);

    return chainOperationsResult.concat(historicOperationsResult);
  },
});

export const initialOnChainFetch = createRemoteResource<
  { apis: Record<ChainId, ApiPromise>; accountId: AccountId; chains: Record<ChainId, Chain> },
  { callHashesByChain: Record<ChainId, HexString[]>; onChainData: Record<HexString, MultisigOperation> }
>({
  async fn({ apis, accountId, chains }) {
    const callHashesByChain: Record<ChainId, HexString[]> = {};
    const onChainData: Record<HexString, MultisigOperation> = {};

    for (const api of Object.values(apis)) {
      const storageEntries = await api.query.multisig.multisigs.entries(accountId);
      const chain = chains[api.genesisHash.toHex()];

      if (!chain) continue;

      for (const [storageKey, optionalMultisig] of storageEntries) {
        // Extract callHash from the storage key (second argument)
        const [, callHashArg] = storageKey.args;
        const callHash = callHashArg.toHex();

        if (optionalMultisig.isSome) {
          const multisig = optionalMultisig.unwrap();

          callHashesByChain[api.genesisHash.toHex()] = [
            ...(callHashesByChain[api.genesisHash.toHex()] || []),
            callHash,
          ];

          onChainData[callHash] = await createOperationFromMultisig({
            api,
            chain,
            accountId,
            callHash,
            multisig,
          });
        }
      }
    }

    return {
      callHashesByChain,
      onChainData,
    };
  },
});

export const subscribeOnchainResource = createQuerySubscriptionResource<{
  api: ApiPromise;
  hashes: Record<AccountId, HexString[]>;
  chain: Chain;
}>({
  key: ({ api }) => api.genesisHash.toHex(),
})
  .subscribe<Record<HexString, MultisigOperation | null>>(async ({ chain, api, hashes }, callback) => {
    const queries: QueryableStorageMultiArg<'promise'>[] = [];
    const paths: HexString[] = [];

    for (const [accountId, callHashes] of entries(hashes)) {
      for (const callHash of callHashes) {
        queries.push([api.query.multisig.multisigs, [accountId, callHash]]);
        paths.push(callHash);
      }
    }

    const unsubscribe = await api.queryMulti(queries, (results: Option<PalletMultisigMultisig>[]) => {
      console.log('huy queryMulti', api.genesisHash.toHex());
      const onChainData: Record<HexString, MultisigOperation | null> = {};

      // eslint-disable-next-line no-restricted-syntax
      results.forEach(async (optionalMultisig, index: number) => {
        const callHash = paths[index]!;

        if (optionalMultisig.isNone) {
          onChainData[callHash] = null;
        } else {
          const multisig = optionalMultisig.unwrap();

          let accountId: AccountId | null = null;
          for (const [localAccountId, callHashes] of entries(hashes)) {
            if (callHashes.includes(callHash)) {
              accountId = localAccountId;
              break;
            }
          }

          if (!accountId) {
            console.error('accountId not found for callHash', callHash);
            return;
          }

          onChainData[callHash] = await createOperationFromMultisig({
            api,
            chain,
            accountId,
            callHash,
            multisig,
          });
        }
      });

      callback(onChainData);
    });

    return unsubscribe;
  })
  .build();

export const subscribeOnChainEventsResource = createQuerySubscriptionResource<{
  api: ApiPromise;
  accountId: AccountId;
}>({
  key: ({ api }) => api.genesisHash.toHex(),
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
  .build();

export const subscribeResource = createSubscriptionResource<RequestParams, MultisigOperation[]>({
  pool: params => `${params.accountId}_${Object.keys(params.apis).join('_')}`,
  fn({ accountId, apis, chains }, callback) {
    const unsubscribeFns: VoidFunction[] = [];

    fetchAllOnchainOperations(apis, accountId, chains).then(chainOperations => {
      callback({ done: true, value: chainOperations });
    });

    for (const api of Object.values(apis)) {
      const unsubscribeFn = polkadotjsHelpers.subscribeSystemEvents(
        { api, section: 'multisig', methods: ['NewMultisig'] },
        () => {
          fetchOnchainOperations(api, accountId, chains[api.genesisHash.toHex()]!).then(operations => {
            callback({ done: true, value: operations });
          });
        },
      );
      unsubscribeFns.push(() => unsubscribeFn.then(fn => fn()));
    }

    return () => {
      for (const fn of unsubscribeFns) {
        fn();
      }
    };
  },
});

export const subscribeEventsResource = createSubscriptionResource<
  RequestParams,
  { event: MultisigEvent; operationId: string; chainId: ChainId }
>({
  pool: params => `${params.accountId}_${Object.keys(params.apis).join('_')}`,
  fn: ({ accountId, apis }, callback) => {
    const unsubscribeFns: Promise<VoidFunction>[] = [];

    for (const [chainId, api] of entries(apis)) {
      const unsubscribeFn = polkadotjsHelpers.subscribeSystemEvents(
        {
          api,
          section: 'multisig',
          methods: ['MultisigApproval', 'MultisigExecuted', 'MultisigCancelled'],
        },
        event => {
          const data = multisigEvent.parse(event.data);

          if (data.multisigAccountId !== accountId) return;

          const operationId = multisigOperationService.getOperationId(
            chainId,
            data.callHash,
            data.multisigAccountId,
            data.timepoint.height,
            data.timepoint.index,
          );

          const eventStatus = event.method === 'MultisigCancelled' ? 'reject' : 'approve';

          callback({
            done: true,
            value: {
              chainId: api.genesisHash.toHex(),
              operationId,
              event: {
                id: multisigOperationService.getEventId(operationId, accountId, eventStatus),
                accountId: data.accountId,
                status: eventStatus,
                indexCreated: data.timepoint.index,
                blockCreated: data.timepoint.height,
                timestamp: Date.now(),
              },
            },
          });
        },
      );

      unsubscribeFns.push(unsubscribeFn);
    }

    return () => {
      Promise.all(unsubscribeFns).then(fns => {
        for (const fn of fns) {
          fn();
        }
      });
    };
  },
});
