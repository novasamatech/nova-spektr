import { gql } from '@apollo/client';

// Schema may be checked at
// https://github.com/novasamatech/subquery-governance/blob/master/schema.graphql
// TODO: Add generated types

export const GET_DELEGATE_LIST = gql`
  query DelegateList($activityStartBlock: Int) {
    delegates {
      nodes {
        accountId
        delegators
        delegatorVotes
        delegateVotes {
          totalCount
        }
        delegateVotesMonth: delegateVotes(filter: { at: { greaterThanOrEqualTo: $activityStartBlock } }) {
          totalCount
        }
      }
    }
  }
`;

export const GET_DELEGATOR = gql`
  query DelegatorVotings($voters: [String!]) {
    delegatorVotings(filter: { delegator: { in: $voters } }) {
      nodes {
        vote
        parent {
          referendumId
          standardVote
          delegateId
        }
      }
    }
  }
`;

export const GET_DELEGATES_FOR_ACCOUNT = gql`
  query GetDelegateByAccountId($accountId: String!) {
    delegates(filter: { accountId: { equalTo: $accountId } }) {
      nodes {
        id
        accountId
        delegations {
          nodes {
            id
            delegator
            delegation
            trackId
          }
        }
      }
    }
  }
`;

export const GET_CASTING_VOTINGS = gql`
  query CastingVotings($voters: [String!]) {
    castingVotings(filter: { voter: { in: $voters } }) {
      nodes {
        referendumId
        standardVote
        splitVote
        splitAbstainVote
      }
    }
  }
`;
