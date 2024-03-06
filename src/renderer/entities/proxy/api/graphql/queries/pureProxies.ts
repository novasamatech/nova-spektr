import { gql } from 'graphql-request';

export const CHECK_PURE_PROXIES = gql`
  query PureProxies($accountIds: [String!]) {
    pureProxies(filter: { id: { in: $accountIds } }) {
      nodes {
        id
      }
    }
  }
`;
