import { GraphQLClient } from 'graphql-request';

import { dictionary } from '@/shared/lib/utils';
import { type Address, type Chain, ExternalType, type ReferendumId } from '@shared/core';
import { type DelegateAccount, type DelegateDetails, type DelegateStat, type DelegationApi } from '../lib/types';

import { GET_DELEGATE_LIST, GET_DELEGATOR } from './delegation/queries';

const DELEGATE_REGISTRY_URL =
  'https://raw.githubusercontent.com/novasamatech/opengov-delegate-registry/master/registry';

async function getDelegatesFromRegistry(chain: Chain): Promise<DelegateDetails[]> {
  const normalizedName = chain.name.toLowerCase();

  return fetch(`${DELEGATE_REGISTRY_URL}/${normalizedName}.json`)
    .then((res) => res.json())
    .catch(() => []);
}

async function getDelegatesFromExternalSource(chain: Chain, blockNumber: number): Promise<DelegateStat[]> {
  const externalApi = chain.externalApi?.[ExternalType.DELEGATIONS]?.at(0);
  const sourceType = externalApi?.type;
  const sourceUrl = externalApi?.url;

  if (sourceType === 'subquery' && sourceUrl) {
    try {
      const client = new GraphQLClient(sourceUrl);

      const data = await client.request(GET_DELEGATE_LIST, { activityStartBlock: blockNumber });

      return (
        (data as any)?.delegates?.nodes?.map(({ accountId, delegators, delegatorVotes, delegateVotes }: any) => ({
          accountId,
          delegators,
          delegatorVotes,
          delegateVotes: delegateVotes.totalCount,
        })) || []
      );
    } catch {
      return [];
    }
  }

  return [];
}

async function getDelegatedVotesFromExternalSource(
  chain: Chain,
  voters: Address[],
): Promise<Record<ReferendumId, Address>> {
  const externalApi = chain.externalApi?.[ExternalType.DELEGATIONS]?.at(0);
  const sourceType = externalApi?.type;
  const sourceUrl = externalApi?.url;

  if (sourceType === 'subquery' && sourceUrl) {
    try {
      const client = new GraphQLClient(sourceUrl);
      const data = await Promise.all(voters.map((voter) => client.request(GET_DELEGATOR, { voter })));
      const list = data.flatMap((x: any) => x.delegatorVotings.nodes.map((node: { parent: any }) => node.parent)) as {
        referendumId: ReferendumId;
        voter: Address;
      }[];

      return list.reduce<Record<ReferendumId, Address>>((acc, record) => {
        acc[record.referendumId] = record.voter;

        return acc;
      }, {});
    } catch {
      return {};
    }
  }

  return {};
}

function aggregateDelegateAccounts(accounts: DelegateDetails[], stats: DelegateStat[]): DelegateAccount[] {
  const accountsMap = dictionary(stats, 'accountId');

  for (const account of accounts) {
    accountsMap[account.address] = { ...accountsMap[account.address], ...account };
  }

  return Object.values(accountsMap);
}

export const delegationService: DelegationApi = {
  getDelegatesFromRegistry,
  getDelegatesFromExternalSource,
  getDelegatedVotesFromExternalSource,
  aggregateDelegateAccounts,
};
