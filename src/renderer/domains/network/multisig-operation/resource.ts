import { gql } from '@apollo/client';
import { type ApiPromise } from '@polkadot/api';
import { GraphQLClient } from 'graphql-request';
import { z } from 'zod';

import { type Chain, type ChainId, type DecodedTransaction, type HexString } from '@/shared/core';
import { getCreatedDateFromApi, nullable } from '@/shared/lib/utils';
import { multisigPallet } from '@/shared/pallet/multisig';
import { polkadotjsHelpers } from '@/shared/polkadotjs-helpers';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';
import { createRemoteResource, createSubscriptionResource } from '@/shared/resource';
import { decodeCallData } from '@/entities/transaction';

import { multisigOperationService } from './service';
import { type MultisigEvent, type MultisigOperation } from './types';

const operationsGqlSchema = z.object({
  timestamp: z.number().transform(value => value * 1000),
  status: z.enum(['pending', 'cancelled', 'executed', 'error']),
  blockCreated: z.number().transform(pjsSchema.helpers.toBlockHeight),
  indexCreated: z.number(),
  accountId: z.string().transform(pjsSchema.helpers.toAccountId),
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

const operationsQuery = gql`
  query List($accountId: String!) {
    multisigOperations(filter: { accountId: { equalTo: $accountId } }) {
      nodes {
        status
        accountId
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
  api: ApiPromise,
  chains: Record<ChainId, Chain>,
): MultisigOperation | null {
  const response = operationsGqlSchema.parse(node);
  const operationId = multisigOperationService.getOperationId(
    api.genesisHash.toHex(),
    response.callHash,
    response.accountId,
    response.blockCreated,
    response.indexCreated,
  );

  let transaction: DecodedTransaction | null = null;

  try {
    if (response.callData) {
      transaction = decodeCallData(api, response.accountId, response.callData, chains);
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
  url: string,
  accountId: AccountId,
  api: ApiPromise,
  existing: MultisigOperation[],
  chains: Record<ChainId, Chain>,
): Promise<MultisigOperation[]> {
  const client = new GraphQLClient(url);
  const result = await client.request<any, { accountId: AccountId }>(operationsQuery, { accountId });

  const existingMultisigs = new Set(existing.map(e => e.id));

  return result.multisigOperations.nodes
    .map((node: unknown) => mapSubqueryOperationRecord(node, api, chains))
    .filter((x: MultisigOperation | null) => {
      if (nullable(x)) return false;

      // we consider "pending" operations from indexer as invalid. All pending operations should be fetched from chain directly.
      if (x.status === 'pending') {
        return false;
      }

      // filtering out existing operations
      if (existingMultisigs.has(x.id)) {
        return false;
      }

      return true;
    });
}

const fetchOnchainOperations = async (
  api: ApiPromise,
  chain: Chain,
  accountId: AccountId,
  chains: Record<ChainId, Chain>,
) => {
  const operations: MultisigOperation[] = [];

  const response = await multisigPallet.storage.multisigs(api, accountId);
  const chainId = chain.chainId;

  for (const { key, multisig } of response) {
    if (nullable(multisig)) continue;

    const timestamp = await getCreatedDateFromApi(multisig.when.height, api);
    const operationId = multisigOperationService.getOperationId(
      chain.chainId,
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
      decodedTransaction = callData ? decodeCallData(api, accountId, callData, chains) : null;
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

type RequestParams = {
  api: ApiPromise;
  chains: Record<ChainId, Chain>;
  chain: Chain;
  accountId: AccountId;
};

export const fetchResource = createRemoteResource<RequestParams, MultisigOperation[]>({
  pool: ({ chain }) => chain.chainId,
  async fn({ api, accountId, chain, chains }) {
    const url = chain.externalApi?.proxy?.find(x => x.type === 'subquery')?.url;
    if (nullable(url)) {
      throw new Error(`Proxy/multisig indexer doesn't support ${chain.name} chain`);
    }

    const chainOperations = await fetchOnchainOperations(api, chain, accountId, chains);
    const historicOperations = await fetchOperationsHistory(url, accountId, api, chainOperations, chains);

    return [...chainOperations, ...historicOperations];
  },
});

export const subscribeResource = createSubscriptionResource<RequestParams[], MultisigOperation[]>({
  pool: params => params.flatMap(x => [x.chain.chainId, x.accountId]).join('_'),
  fn(params, callback) {
    const unsubscribeFns: VoidFunction[] = [];

    for (const { chain, accountId, api, chains } of params) {
      const url = chain.externalApi?.proxy?.find(x => x.type === 'subquery')?.url;
      if (nullable(url)) {
        throw new Error(`Proxy/multisig indexer doesn't support ${chain.name} chain`);
      }

      fetchOnchainOperations(api, chain, accountId, chains).then(chainOperations => {
        callback({ done: true, value: chainOperations });

        fetchOperationsHistory(url, accountId, api, chainOperations, chains).then(historicOperations => {
          callback({ done: true, value: historicOperations });
        });
      });

      const unsubscribeFn = polkadotjsHelpers.subscribeSystemEvents(
        { api, section: 'multisig', methods: ['NewMultisig'] },
        () => {
          fetchOnchainOperations(api, chain, accountId, chains).then(operations => {
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
  RequestParams[],
  { event: MultisigEvent; operationId: string; chainId: ChainId }
>({
  fn: (params, callback) => {
    const unsubscribeFns: Promise<VoidFunction>[] = [];

    for (const { accountId, api } of params) {
      const chainId = api.genesisHash.toHex();
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
