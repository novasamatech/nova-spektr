import { gql } from '@apollo/client';

// Schema may be checked at
// https://github.com/novasamatech/subquery-governance/blob/master/schema.graphql

export const GET_DELEGATE_LIST = gql`
  query DelegateList($activityStartBlock: Int) {
    delegates {
      nodes {
        accountId
        delegators
        delegatorVotes
        delegateVotes(filter: { at: { greaterThanOrEqualTo: $activityStartBlock } }) {
          totalCount
        }
      }
    }
  }
`;
