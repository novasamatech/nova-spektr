import { gql } from '@apollo/client';

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
