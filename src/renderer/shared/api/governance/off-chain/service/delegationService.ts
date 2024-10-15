import { BN } from '@polkadot/util';
import { GraphQLClient } from 'graphql-request';

import { type Address, type Chain, ExternalType, type ReferendumId } from '@/shared/core';
import { dictionary, toPrecision } from '@/shared/lib/utils';
import {
  type DelegateAccount,
  type DelegateDetails,
  type DelegateStat,
  type Delegation,
  type DelegationApi,
  type DelegationsByAccount,
} from '../lib/types';

import { GET_DELEGATES_FOR_ACCOUNT, GET_DELEGATE_LIST, GET_DELEGATOR } from './delegation/queries';

const DELEGATE_REGISTRY_URL =
  'https://raw.githubusercontent.com/novasamatech/opengov-delegate-registry/master/registry';

const getGraphQLClient = (chain: Chain) => {
  const externalApi = chain.externalApi?.[ExternalType.DELEGATIONS]?.at(0);
  const sourceType = externalApi?.type;
  const sourceUrl = externalApi?.url;

  if (sourceType === 'subquery' && sourceUrl) {
    try {
      return new GraphQLClient(sourceUrl);
    } catch {
      return null;
    }
  }

  return null;
};

async function getDelegatesFromRegistry(chain: Chain): Promise<DelegateDetails[]> {
  const normalizedName = chain.name.toLowerCase();

  return fetch(`${DELEGATE_REGISTRY_URL}/${normalizedName}.json`)
    .then((res) => res.json())
    .catch(() => []);
}

async function getDelegatesFromExternalSource(chain: Chain, blockNumber: number): Promise<DelegateStat[]> {
  const client = getGraphQLClient(chain);
  if (!client) {
    return [];
  }

  return client
    .request(GET_DELEGATE_LIST, { activityStartBlock: blockNumber })
    .then((data) => {
      return (
        (data as any)?.delegates?.nodes?.map(
          ({ accountId, delegators, delegatorVotes, delegateVotes, delegateVotesMonth }: any) => ({
            accountId,
            delegators,
            delegatorVotes,
            delegateVotes: delegateVotes.totalCount,
            delegateVotesMonth: delegateVotesMonth.totalCount,
          }),
        ) || []
      );
    })
    .catch(() => []);
}

async function getDelegatedVotesFromExternalSource(
  chain: Chain,
  voters: Address[],
): Promise<Record<ReferendumId, Address>> {
  const client = getGraphQLClient(chain);
  if (!client) {
    return {};
  }

  return client
    .request(GET_DELEGATOR, { voters })
    .then((data: any) => {
      const list = data.delegatorVotings.nodes.map((node: { parent: any }) => node.parent) as {
        referendumId: ReferendumId;
        voter: Address;
      }[];

      return list.reduce<Record<ReferendumId, Address>>((acc, record) => {
        acc[record.referendumId] = record.voter;

        return acc;
      }, {});
    })
    .catch(() => ({}));
}

function aggregateDelegateAccounts(accounts: DelegateDetails[], stats: DelegateStat[]): DelegateAccount[] {
  const accountsMap = dictionary(stats, 'accountId');

  for (const account of accounts) {
    accountsMap[account.address] = { ...accountsMap[account.address], ...account };
  }

  return Object.values(accountsMap);
}

async function getDelegatesForAccount(chain: Chain, accountId: string): Promise<DelegationsByAccount | null> {
  const client = getGraphQLClient(chain);
  if (!client) {
    return null;
  }

  return client
    .request(GET_DELEGATES_FOR_ACCOUNT, { accountId })
    .then((data) => {
      const result = (data as any)?.delegates?.nodes?.[0];

      return {
        accountId: result.accountId,
        delegations: result.delegations.nodes.map((x: Delegation) => x),
      };
    })
    .catch(() => null);
}

function calculateTotalVotes(votingPower: BN, tracks: number[], chain: Chain): BN {
  return toPrecision(votingPower, chain.assets[0].precision).mul(new BN(tracks.length));
}

export const delegationService: DelegationApi = {
  getDelegatesFromRegistry,
  getDelegatesFromExternalSource,
  getDelegatedVotesFromExternalSource,
  getDelegatesForAccount,
  aggregateDelegateAccounts,

  calculateTotalVotes,
};
