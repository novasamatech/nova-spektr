export const GET_TOTAL_REWARDS = `
  query Rewards($addresses: [String!]) {
    accumulatedRewards(filter: { id: { in: $addresses } }) {
      nodes {
        id
        amount
      }
    }
  }
`;
