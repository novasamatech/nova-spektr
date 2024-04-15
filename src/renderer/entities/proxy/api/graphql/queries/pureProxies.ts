import { gql } from 'graphql-request';

export const FILTER_PURE_PROXIED_ACCOUNT_IDS = gql`
  query PureProxies($accountIds: [String!]) {
    pureProxies(filter: { id: { in: $accountIds } }) {
      nodes {
        id
        blockNumber
        extrinsicIndex
      }
    }
  }
`;
