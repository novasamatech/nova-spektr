import { gql } from 'graphql-request';

export const PROXIED_CHAINS_BY_ACCOUNT_ID = gql`
  query ProxiedChainsByAccountId($accountIds: [String!]) {
    proxieds(filter: { accountId: { in: $accountIds }, isPureProxy: { equalTo: true } }) {
      nodes {
        accountId
        chainId
      }
    }
  }
`;
