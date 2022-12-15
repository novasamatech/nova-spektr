import { gql } from '@apollo/client';

export const GET_TOTAL_REWARDS = gql`
  query Rewards($addresses: [String!]) {
    accumulatedRewards(filter: { id: { in: $addresses } }) {
      nodes {
        id
        amount
      }
    }
  }
`;
