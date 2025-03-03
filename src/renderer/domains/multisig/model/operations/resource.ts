import { gql } from '@apollo/client';
import { GraphQLClient } from 'graphql-request';
import { z } from 'zod';

import { type ChainId } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';
import { vecSchema } from '@/shared/polkadotjs-schemas/structs';

import { type MultisigOperation } from './types';

const operationsGqlSchema = z.object({
  id: z.string(),
  timestamp: z.string().transform(value => Number(value) * 1000),
  status: z.enum(['pending', 'cancelled', 'executed', 'error']),
  blockCreated: z.number().transform(pjsSchema.helpers.toBlockHeight),
  indexCreated: z.number(),
  accountId: z.string().transform(pjsSchema.helpers.toAccountId),
  depositor: z.string().transform(pjsSchema.helpers.toAccountId),
  callHash: z.string().transform(pjsSchema.helpers.toHex),
  callData: z.string().transform(pjsSchema.helpers.toHex).nullable(),
  args: z.any(),
  method: z.string().nullable(),
  section: z.string().nullable(),
  events: z.object({
    nodes: vecSchema(
      z.object({
        id: z.string(),
        accountId: z.string().transform(pjsSchema.helpers.toAccountId),
        status: z.enum(['approve', 'reject']),
        blockCreated: z.number().transform(pjsSchema.helpers.toBlockHeight),
        indexCreated: z.number(),
        timestamp: z.string().transform(value => Number(value) * 1000),
      }),
    ),
  }),
});

const operationsQuery = gql`
  query List($accountId: String!) {
    multisigOperations(filter: { accountId: { equalTo: $accountId } }) {
      nodes {
        id
        status
        accountId
        callHash
        callData
        depositor
        blockCreated
        indexCreated
        timestamp
        args
        method
        section
        events {
          nodes {
            accountId
            id
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

  return { ...response, events: response.events.nodes, chainId };
}

export async function fetchOperations(
  url: string,
  accountId: AccountId,
  chainId: ChainId,
): Promise<MultisigOperation[]> {
  const client = new GraphQLClient(url);
  const result = await client.request<any, { accountId: AccountId }>(operationsQuery, { accountId });

  return result.multisigOperations.nodes
    .map((node: unknown) => mapSubqueryOperationRecord(node, chainId))
    .filter(nonNullable);
}
