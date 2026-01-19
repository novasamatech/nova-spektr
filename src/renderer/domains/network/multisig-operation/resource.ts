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
import { createRemoteResource } from '@/shared/resource';
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
  } catch (error) {
    console.warn('Failed to decode call data', { callHash, error });
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
  } catch (error) {
    console.warn('Failed to decode call data from indexer response', { callHash: response.callHash, error });
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

type RequestParams = {
  apis: Record<ChainId, ApiPromise>;
  chains: Record<ChainId, Chain>;
  accountIds: AccountId[];
};

export const fetchOffchainResource = createRemoteResource<RequestParams, MultisigOperation[]>({
  async fn({ apis, accountIds, chains }) {
    return fetchOperationsHistory(accountIds, apis, chains);
  },
});

export const initialOnChainFetch = createRemoteResource<
  RequestParams,
  {
    callHashesByChain: Record<ChainId, Record<AccountId, HexString[]>>;
    onChainData: Record<HexString, MultisigOperation>;
  }
>({
  async fn({ apis, accountIds, chains }) {
    const callHashesByChain: Record<ChainId, Record<AccountId, HexString[]>> = {};
    const onChainData: Record<HexString, MultisigOperation> = {};

    for (const api of Object.values(apis)) {
      const chain = chains[api.genesisHash.toHex()];
      if (!chain) continue;

      callHashesByChain[api.genesisHash.toHex()] = {};

      for (const accountId of accountIds) {
        const storageEntries = await api.query.multisig.multisigs.entries(accountId);
        const accountHashes: HexString[] = [];

        for (const [storageKey, optionalMultisig] of storageEntries) {
          // Extract callHash from the storage key (second argument)
          const [, callHashArg] = storageKey.args;
          const callHash = callHashArg.toHex();

          if (optionalMultisig.isSome) {
            const multisig = optionalMultisig.unwrap();

            accountHashes.push(callHash);

            onChainData[callHash] = await createOperationFromMultisig({
              api,
              chain,
              accountId,
              callHash,
              multisig,
            });
          }
        }

        callHashesByChain[api.genesisHash.toHex()]![accountId] = accountHashes;
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
  recreateOnSubscribe: true,
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

    const unsubscribe = await api.queryMulti(queries, async (results: Option<PalletMultisigMultisig>[]) => {
      const onChainData: Record<HexString, MultisigOperation | null> = {};

      for (let index = 0; index < results.length; index++) {
        const optionalMultisig = results[index]!;
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
            continue;
          }

          onChainData[callHash] = await createOperationFromMultisig({
            api,
            chain,
            accountId,
            callHash,
            multisig,
          });
        }
      }

      callback(onChainData);
    });

    return unsubscribe;
  })
  .build();

export const subscribeNewMultisigEventsResource = createQuerySubscriptionResource<{
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
  .build();

export const subscribeEventsResource = createQuerySubscriptionResource<{
  api: ApiPromise;
  accountId: AccountId;
}>({
  key: ({ api, accountId }) => `${api.genesisHash.toHex()}-${accountId}`,
})
  .subscribe<{ event: MultisigEvent; operationId: string }>(async ({ api, accountId }, callback) => {
    const unsubscribeFn = await polkadotjsHelpers.subscribeSystemEvents(
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
            id: multisigOperationService.getEventId(operationId, accountId, eventStatus),
            accountId: data.accountId,
            status: eventStatus,
            indexCreated: data.timepoint.index,
            blockCreated: data.timepoint.height,
            timestamp: Date.now(),
          },
        });
      },
    );

    return unsubscribeFn;
  })
  .build();
