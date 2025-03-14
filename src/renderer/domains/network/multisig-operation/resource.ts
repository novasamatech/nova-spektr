import { gql } from '@apollo/client';
import { type ApiPromise } from '@polkadot/api';
import { GraphQLClient } from 'graphql-request';
import { z } from 'zod';

import { type ChainId } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { multisigPallet } from '@/shared/pallet/multisig';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';
import { vecSchema } from '@/shared/polkadotjs-schemas/structs';
import { decodeCallData } from '@/entities/transaction';

import { multisigOperationService } from './service';
import { type MultisigOperation } from './types';

const operationsGqlSchema = z.object({
  timestamp: z.number().transform(value => value * 1000),
  status: z.enum(['pending', 'cancelled', 'executed', 'error']),
  blockCreated: z.number().transform(pjsSchema.helpers.toBlockHeight),
  indexCreated: z.number(),
  accountId: z.string().transform(pjsSchema.helpers.toAccountId),
  depositor: z.string().transform(pjsSchema.helpers.toAccountId),
  callHash: z.string().transform(pjsSchema.helpers.toHex),
  callData: z.string().transform(pjsSchema.helpers.toHex).nullable(),
  method: z.string().nullable(),
  section: z.string().nullable(),
  events: z.object({
    nodes: vecSchema(
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

function mapSubqueryOperationRecord(node: unknown, chainId: ChainId): MultisigOperation | null {
  const response = operationsGqlSchema.parse(node);
  const operationId = multisigOperationService.getOperationId(
    response.callHash,
    response.accountId,
    response.blockCreated,
    response.indexCreated,
  );

  return {
    ...response,
    id: operationId,
    events: response.events.nodes.map(event => {
      return {
        ...event,
        id: multisigOperationService.getEventId(operationId, event.accountId, event.status),
      };
    }),
    chainId,
  };
}

export async function fetchOperations(
  url: string,
  accountId: AccountId,
  chainId: ChainId,
  api: ApiPromise,
): Promise<MultisigOperation[]> {
  const client = new GraphQLClient(url);
  const result = await client.request<any, { accountId: AccountId }>(operationsQuery, { accountId });

  return result.multisigOperations.nodes
    .map((node: unknown) => mapSubqueryOperationRecord(node, chainId))
    .filter(nonNullable)
    .map((record: MultisigOperation) => {
      if (record.callData) {
        try {
          const decoded = decodeCallData(api, record.accountId, record.callData);
          return {
            ...record,
            args: decoded.args,
          };
        } catch {
          return record;
        }
      }
      return record;
    });
}

export const multisigEvent = pjsSchema.tupleMap(
  ['accountId', pjsSchema.accountId],
  ['timepoint', multisigPallet.schema.multisigTimepoint],
  ['multisigAccountId', pjsSchema.accountId],
  ['callHash', pjsSchema.hex],
);
