import { gql } from '@apollo/client';

export const GET_TOTAL_REWARDS = gql`
  query Rewards($first: Int, $address: String!) {
    accumulatedRewards(first: $first, filter: { id: { equalTo: $address } }) {
      nodes {
        id
        amount
      }
    }
  }
`;
