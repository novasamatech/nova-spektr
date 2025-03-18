import { gql } from '@apollo/client';
import { GraphQLClient } from 'graphql-request';
import { z } from 'zod';

import { type ChainId } from '@/shared/core';
import { multisigPallet } from '@/shared/pallet/multisig';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';
import { type EncodedTransaction } from '../transaction/types';

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

function mapSubqueryOperationRecord(node: unknown, chainId: ChainId): MultisigOperation | null {
  const response = operationsGqlSchema.parse(node);
  const operationId = multisigOperationService.getOperationId(
    response.callHash,
    response.accountId,
    response.blockCreated,
    response.indexCreated,
  );

  const transaction: EncodedTransaction | null = response.callData
    ? {
        type: 'encoded',
        callData: response.callData,
      }
    : null;

  return {
    id: operationId,
    transaction,
    section: response.section,
    method: response.method,
    timestamp: response.timestamp,
    accountId: response.accountId,
    callHash: response.callHash,
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
    chainId,
  };
}

export async function fetchOperations(
  url: string,
  accountId: AccountId,
  chainId: ChainId,
): Promise<MultisigOperation[]> {
  const client = new GraphQLClient(url);
  const result = await client.request<any, { accountId: AccountId }>(operationsQuery, { accountId });

  return result.multisigOperations.nodes.map((node: unknown) => mapSubqueryOperationRecord(node, chainId));
}

export const multisigEvent = z.union([
  pjsSchema.tupleMap(
    ['accountId', pjsSchema.accountId],
    ['timepoint', multisigPallet.schema.multisigTimepoint],
    ['multisigAccountId', pjsSchema.accountId],
    ['callHash', pjsSchema.hex],
  ),
  pjsSchema.tupleMap(
    ['accountId', pjsSchema.accountId],
    ['timepoint', multisigPallet.schema.multisigTimepoint],
    ['multisigAccountId', pjsSchema.accountId],
    ['callHash', pjsSchema.hex],
    ['status', pjsSchema.enumType('Ok', 'Basic', 'Empty', 'Err', 'None')],
  ),
]);
