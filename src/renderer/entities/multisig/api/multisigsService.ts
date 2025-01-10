import { type GraphQLClient } from 'graphql-request';

import { type AccountId } from '@/shared/polkadotjs-schemas';

import { FILTER_MULTISIG_ACCOUNT_IDS } from './graphql/queries/multisigs';

export const multisigService = {
  filterMultisigsAccounts,
};

export type MultisigResult = {
  accountId: AccountId;
  threshold: number;
  signatories: AccountId[];
};

async function filterMultisigsAccounts(client: GraphQLClient, accountIds: AccountId[]): Promise<MultisigResult[]> {
  const data = await client.request(FILTER_MULTISIG_ACCOUNT_IDS, { accountIds });

  const filteredMultisigs = (data as any)?.accounts?.nodes?.map(({ id, threshold, signatories }: any) => ({
    accountId: id,
    threshold,
    signatories: signatories.nodes.map(({ signatory }: any) => signatory.id),
  }));

  return filteredMultisigs || [];
}
